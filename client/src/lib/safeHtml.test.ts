import { describe, expect, it } from "vitest";
import { escapeHtml, escapeHtmlWithBreaks } from "./safeHtml";

describe("safeHtml", () => {
  it("escapes active HTML characters in exported interview content", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">&'`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#039;",
    );
  });

  it("adds only explicit line breaks after escaping", () => {
    expect(escapeHtmlWithBreaks("첫 줄\n<script>둘째 줄</script>")).toBe(
      "첫 줄<br>&lt;script&gt;둘째 줄&lt;/script&gt;",
    );
  });
});
