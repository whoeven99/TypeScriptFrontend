const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeUrl = (url: string) => {
  const trimmed = url.trim();
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
    return "";
  }
  return trimmed;
};

const renderInlineMarkdown = (value: string) => {
  let html = escapeHtml(value);

  html = html.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_match, alt, src, title) => {
      const safeSrc = sanitizeUrl(src);
      if (!safeSrc) return escapeHtml(alt || "");
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(alt || "")}"${titleAttr} />`;
    },
  );

  html = html.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_match, text, href, title) => {
      const safeHref = sanitizeUrl(href);
      if (!safeHref) return escapeHtml(text);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${escapeHtml(safeHref)}"${titleAttr}>${text}</a>`;
    },
  );

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>");
  html = html.replace(/~~([^~]+)~~/g, "<s>$1</s>");

  return html;
};

const richTextHtmlTagPattern =
  /<(p|div|span|br|strong|b|em|i|u|s|ul|ol|li|blockquote|code|pre|a|img|table|thead|tbody|tfoot|tr|td|th|h[1-6]|hr|figure|figcaption)\b[^>]*>|<\/(p|div|span|strong|b|em|i|u|s|ul|ol|li|blockquote|code|pre|a|table|thead|tbody|tfoot|tr|td|th|h[1-6]|figure|figcaption)>/i;

const markdownHintPattern =
  /(^|\n)\s{0,3}(#{1,6}\s+|>\s+|[-*+]\s+|\d+\.\s+|```)|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|(\*\*|__|~~|`)/m;

export const looksLikeRichTextHtml = (value: string) =>
  richTextHtmlTagPattern.test(value);

export const sanitizeManageTableHtml = (html: string) => {
  if (typeof document === "undefined") return html;

  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = html;

  doc.body
    .querySelectorAll("script, iframe, object, embed, link, meta, style")
    .forEach((node) => node.remove());

  doc.body.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim();
      const unsafeUrl =
        (attrName === "href" || attrName === "src") &&
        /^(?:javascript|data|vbscript):/i.test(attrValue);

      if (attrName.startsWith("on") || attrName === "srcdoc" || unsafeUrl) {
        node.removeAttribute(attr.name);
      }
    });
  });

  doc.body.querySelectorAll("img").forEach((node) => {
    node.removeAttribute("width");
    node.removeAttribute("height");
    node.removeAttribute("align");
    node.style.maxWidth = "100%";
    node.style.height = "auto";
    node.style.float = "none";
    node.style.display = "block";
    node.style.margin = "8px auto";
  });

  return doc.body.innerHTML;
};

export const normalizeManageTableRichTextContent = (value?: string) => {
  const source = value?.trim() ?? "";
  if (!source) return "";
  if (looksLikeRichTextHtml(source)) {
    return sanitizeManageTableHtml(value as string);
  }
  if (!markdownHintPattern.test(source)) {
    return source
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${renderInlineMarkdown(paragraph.trim())}</p>`)
      .join("");
  }

  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const result: string[] = [];
  let paragraphLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    result.push(`<p>${renderInlineMarkdown(paragraphLines.join(" "))}</p>`);
    paragraphLines = [];
  };

  const closeList = () => {
    if (!listType) return;
    result.push(`</${listType}>`);
    listType = null;
  };

  const flushCodeBlock = () => {
    if (!codeLines.length) {
      result.push("<pre><code></code></pre>");
      return;
    }
    result.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (inCodeBlock) {
      if (/^```/.test(trimmed)) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushParagraph();
      closeList();
      inCodeBlock = true;
      codeLines = [];
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      result.push(
        `<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`,
      );
      continue;
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushParagraph();
      closeList();
      result.push(
        `<blockquote><p>${renderInlineMarkdown(blockquoteMatch[1])}</p></blockquote>`,
      );
      continue;
    }

    const orderedListMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedListMatch) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        result.push("<ol>");
        listType = "ol";
      }
      result.push(`<li>${renderInlineMarkdown(orderedListMatch[1])}</li>`);
      continue;
    }

    const unorderedListMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unorderedListMatch) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        result.push("<ul>");
        listType = "ul";
      }
      result.push(`<li>${renderInlineMarkdown(unorderedListMatch[1])}</li>`);
      continue;
    }

    closeList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  closeList();
  if (inCodeBlock) {
    flushCodeBlock();
  }

  return result.join("");
};
