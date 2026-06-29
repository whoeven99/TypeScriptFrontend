# Translate V4 初始化筛选逻辑

本文档说明 `translateV4/translationFilter` 在初始化阶段如何判断一个字段是否应该进入翻译任务。

核心入口是 `shouldIncludeFieldV2()`，对应实现见：

- `app/server/translateV4/translationFilter/shouldIncludeFieldV2.ts`
- `app/server/translateV4/translationFilter/v3Base.ts`
- `app/server/translateV4/translationFilter/judgeTranslateUtils.ts`
- `app/server/translateV4/translationFilter/themeRules.ts`
- `app/server/translateV4/translationFilter/metafieldRules.ts`

## 1. 目标

初始化阶段的目标不是把 Shopify 返回的所有 `translatableContent` 都送去翻译，而是从中筛出：

- 真正像用户可读文案的字段
- 当前任务需要翻译或重翻的字段
- 不会破坏 Shopify 资源结构或主题配置的字段

只要任意一层规则不通过，该字段就会在初始化阶段被排除，不进入后续翻译流程。

## 2. 总体决策树

下面是与代码顺序一致的伪代码，接近 `if / else` 形式：

```ts
function shouldIncludeFieldV2(content, translations, ctx) {
  const value = content.value ?? "";
  const type = content.type ?? "";
  const key = content.key;
  const { module, isCover, isHandle } = ctx;

  if (value 为空或全空白) {
    return false;
  }

  if (
    module 是 PRODUCT_OPTION 或 PRODUCT_OPTION_VALUE
    && trim(value) 命中 Shopify 商品选项默认占位值
  ) {
    return false;
  }

  if (
    当前不是覆盖模式
    && 当前 key 已存在翻译
    && 该翻译不是 outdated
  ) {
    return false;
  }

  if (type 命中基础不可翻译类型集合) {
    return false;
  }

  if (type === "JSON" && module !== "METAFIELD") {
    return false;
  }

  if (type === "URI" && key === "handle") {
    if (isHandle !== true) {
      return false;
    }
    return true 继续进入后续规则;
  }

  if (不满足通用内容规则) {
    return false;
  }

  if (不满足主题模块专属规则) {
    return false;
  }

  if (不满足 metafield 专属规则) {
    return false;
  }

  if (module === "METAOBJECT" && value 包含 "grp__") {
    return false;
  }

  return true;
}
```

更准确地说，`handle` 那段不是直接放行最终结果，而是表示它在这一层不因为 `handle` 被拦截，后面仍然要继续通过通用规则、主题规则、metafield 规则等后续判断。

## 3. 逐层规则说明

### 第 1 层：空值过滤

规则：

```ts
if (value == null || value.trim() === "") return false;
```

说明：

- 空字符串、只包含空格或换行的值，没有翻译意义。
- 这一步是最基础的早退规则。

对应代码：

- `v3Base.ts` 中的 `isBlankValue()`
- `shouldIncludeFieldV2.ts` 中的首个空值判断

### 第 2 层：默认占位值过滤

这一层的核心思想是：有些值虽然长得像文案，但其实是 Shopify 或主题模板自动生成的兜底值，不应该被翻译。

这一层从业务语义上可以统一理解为“默认占位值过滤”，但实现上分为两块。

#### 2.1 商品选项模块默认值

规则：

```ts
if (
  (module === "PRODUCT_OPTION" || module === "PRODUCT_OPTION_VALUE")
  && trim(value) 命中以下集合
) {
  return false;
}
```

命中的默认值集合：

- `Default Title`
- `Default`
- `Title`

说明：

- 这几个值通常是 Shopify 在单规格商品场景下自动生成的占位值。
- 它们不是商家真正配置的可翻译文案。
- 如果把它们翻译并写回，可能破坏 Shopify 对变体结构的默认识别。

#### 2.2 主题模块模板占位值

规则：

```ts
if (module 属于主题模块 && value 命中主题黑名单集合) {
  return false;
}
```

典型主题兜底值包括：

- `Heading`
- `Heading 1`
- `Heading 2`
- `Heading 3`
- `Heading 4`
- `Example heading`
- `Image heading`
- `Video heading`
- `Example title`
- `Image with text`
- `Image with text overlay`
- `Collapsible row`
- `Collapsible row 1`
- `Collapsible row 2`
- `Collapsible row 3`
- `Collapsible row 4`
- `Video slide 1`
- `Video slide 2`
- `Video slide 3`
- `Video slide 4`
- `IMAGE SLIDE 1`
- `IMAGE SLIDE 2`

说明：

- 这些值通常来自主题编辑器的示例标题、默认模块标题、模板演示文案。
- 它们并不一定代表商家真实输入的内容。
- 如果把这类模板占位值翻译进去，容易让主题里出现大量“看起来被翻译了，但其实没有业务意义”的结果。

补充：

- 商品选项默认值和主题模板默认值，建议在文档中归为同一类“默认占位值过滤”。
- 但代码层面仍按模块拆开实现，避免不同模块的规则混在一起。

### 第 3 层：覆盖模式与过期状态过滤

规则：

```ts
if (isCover === true) {
  直接通过这一层;
} else if (当前 key 没有已有翻译) {
  通过这一层;
} else if (已有翻译的 outdated === true) {
  通过这一层;
} else {
  return false;
}
```

说明：

- `isCover=true` 表示覆盖翻译，允许重翻。
- `isCover=false` 表示增量翻译，已有且未过期的译文不需要再次翻译。
- 这一层决定的是“需不需要重翻”，而不是“这个字段本身能不能翻”。

结果：

- 没有译文：翻
- 有译文但已过期：翻
- 有译文且未过期：不翻

### 第 4 层：基础类型过滤

规则：

```ts
if (type 命中 NON_TRANSLATABLE_TYPES) {
  return false;
}
```

当前不可翻译类型集合包括：

- `FILE_REFERENCE`
- `LINK`
- `URL`
- `LIST_FILE_REFERENCE`
- `LIST_LINK`
- `LIST_URL`
- `JSON_STRING`

说明：

- 这些类型更像资源引用、链接、列表链接或结构化字符串，而不是自然语言文案。
- 注意：`URI` 不在这一层的默认黑名单里。

### 第 5 层：JSON 类型模块限制

规则：

```ts
if (type === "JSON" && module !== "METAFIELD") {
  return false;
}
```

说明：

- 当前实现里，`JSON` 类型只有在 `METAFIELD` 模块下才允许继续走后面的规则。
- 其它模块的 `JSON` 类型字段，会在这里直接被排除。
- 这是一个比较保守的策略，目的是避免在未知 JSON 结构上直接做翻译。

### 第 6 层：`handle` 特殊规则

规则：

```ts
if (type === "URI" && key === "handle") {
  return isHandle === true;
}
```

更完整地说：

```ts
if (type === "URI" && key === "handle" && isHandle !== true) {
  return false;
}
```

说明：

- `handle` 是 URI 类型里的特殊字段。
- 它不是默认一定要翻译的字段，而是受任务参数 `isHandle` 控制。
- 当 `isHandle=false` 时，初始化阶段直接跳过。
- 当 `isHandle=true` 时，表示允许继续进入后续规则判断。

结论：

- `URI` 不是全局禁翻类型。
- 只有 `handle` 这个特殊 key 受 `isHandle` 开关控制。

### 第 7 层：通用内容规则过滤

规则：

```ts
if (value 是时间串) return false;
if (value 是空 body 标签) return false;
if (value 像 px 尺寸值) return false;
if (value 是 true / false) return false;
if (value 是很短的 #hash) return false;
if (value 以前缀 http://、https://、shopify://、gid://shopify 开头) return false;
if (value 命中 rejectRules 的正则规则) return false;
```

说明：

这一层要排除的不是模块专属值，而是一类通用的“看起来不像用户文案”的内容，例如：

- 时间字符串
- 样式尺寸值
- 布尔值
- URL
- 资源或对象 ID
- UUID
- hash
- JWT
- 邮箱
- 电话
- 纯数字或纯标点组合

目的：

- 尽量避免把配置、标识符、结构数据误送去翻译。

### 第 8 层：主题模块专属规则

只有当模块属于主题资源类型时，这一层才有意义。

规则可以概括为：

```ts
if (module 不属于主题模块) {
  直接通过这一层;
}

if (key 包含 "general.lange") return false;
if (key 同时包含 "block" 和 "add_button_selector") return false;
if (value 命中主题模板占位值黑名单) return false;

if (module === "ONLINE_STORE_THEME_LOCALE_CONTENT") {
  if (key 包含 gempage / pagefly / ecom / beae / error 等词) {
    return false;
  }
}

if (value 看起来像图片或视频文件名) return false;
if (value 看起来像站内路径) return false;

if (key 以 general. 或 section. 开头) {
  if (命中主题白名单词尾) {
    return true 继续进入后续规则;
  }
  if (不满足 shouldTranslateThemeKey) {
    return false;
  }
}
```

这一层的核心目的是：

- 过滤主题里的模板配置项
- 过滤资源名和路径
- 过滤演示文案
- 仅保留真正像主题前台文案的值

### 第 9 层：metafield 专属规则

只有 `module === "METAFIELD"` 时，这一层才会真正起作用。

规则可以概括为：

```ts
if (module !== "METAFIELD") {
  直接通过这一层;
}

if (value 命中可疑的大写小写数字混合串) return false;
if (value 命中短样式枚举值规则) return false;
if (value 命中 Base64) return false;
if (value 以 "=" 开头) return false;
if (value 包含特定 Judge.me 片段) return false;
if (value === "CC_CC-PT") return false;
```

说明：

- metafield 很容易混入配置值、编码串、样式枚举和第三方应用片段。
- 这层的作用是进一步减少误翻结构化数据的风险。

### 第 10 层：metaobject 特殊兜底

规则：

```ts
if (module === "METAOBJECT" && value.includes("grp__")) {
  return false;
}
```

说明：

- 这是一个明确的业务特判。
- 只要 `METAOBJECT` 的值里包含 `grp__`，就直接不翻。

## 4. 一条更完整的 if / else 版本

如果把上面的规则写成更完整的文字版判断链，可以理解为：

```text
if 值为空
  => 不翻
else if 当前是商品选项模块，且值是 Shopify 默认占位值 Default Title / Default / Title
  => 不翻
else if 当前不是覆盖模式，且该 key 已有未过期译文
  => 不翻
else if type 属于 FILE_REFERENCE / LINK / URL / LIST_FILE_REFERENCE / LIST_LINK / LIST_URL / JSON_STRING
  => 不翻
else if type === JSON 且 module 不是 METAFIELD
  => 不翻
else if type === URI 且 key === handle 且 isHandle !== true
  => 不翻
else if 值命中通用拒绝规则，例如时间串、URL、ID、hash、JWT、邮箱、电话、布尔值、尺寸值等
  => 不翻
else if 当前是主题模块，且命中主题专属排除规则，例如模板占位值 Heading / Heading 1 / Heading 2、资源路径、图片文件名、特定保留 key
  => 不翻
else if 当前是 METAFIELD 模块，且命中 metafield 专属排除规则，例如可疑编码串、Base64、CSS 枚举值、Judge.me 片段
  => 不翻
else if 当前是 METAOBJECT 模块，且值包含 grp__
  => 不翻
else
  => 进入翻译任务
```

## 5. 总结

可以把初始化阶段的筛选逻辑概括为三类问题：

- 这个字段有没有内容
- 这个字段现在需不需要翻
- 这个字段看起来是不是真正的人类可读文案

只有同时满足以下条件，字段才会进入翻译任务：

- 有内容
- 没被默认占位值规则拦截
- 没被已有未过期译文规则拦截
- 没被类型规则拦截
- 没被 `handle` 特殊规则拦截
- 没被通用内容规则拦截
- 没被模块专属规则拦截

最终效果是：尽量把真实用户文案留下来，把系统占位值、资源引用、配置项、路径、结构化内容和可疑编码串排除掉。
