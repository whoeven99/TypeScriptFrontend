import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPassthroughLeafText,
  isTranslatableLeafText,
  looksLikeUntranslated,
} from "./translateQuality.js";

describe("passthrough BR leaves", () => {
  it("treats corner and ascii BR tokens as non-translatable", () => {
    assert.equal(isPassthroughLeafText("\u27E6BR\u27E7"), true);
    assert.equal(isTranslatableLeafText("\u27E6BR\u27E7"), false);
    assert.equal(isPassthroughLeafText("[BR]"), true);
    assert.equal(isTranslatableLeafText("[BR]"), false);
    assert.equal(isPassthroughLeafText("[br]"), true);
    assert.equal(isTranslatableLeafText("  \u27E6BR\u27E7  "), false);
  });

  it("still translates normal text", () => {
    assert.equal(isPassthroughLeafText("Hello"), false);
    assert.equal(isTranslatableLeafText("Hello"), true);
    assert.equal(isTranslatableLeafText("   "), false);
  });

  it("does not flag BR echo as untranslated", () => {
    assert.equal(looksLikeUntranslated("\u27E6BR\u27E7", "\u27E6BR\u27E7", "ja"), false);
    assert.equal(looksLikeUntranslated("[BR]", "[BR]", "ja"), false);
    assert.equal(looksLikeUntranslated("Hello", "Hello", "ja"), true);
  });
});
