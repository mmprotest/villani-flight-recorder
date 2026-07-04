import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parseClaudeSession } from "../src/providers/claude.js";
import { renderReplay } from "../src/render/renderReplay.js";
import { ParsedSession } from "../src/providers/types.js";
const fx = (p: string) => path.resolve("test/fixtures", p);

describe("client interactions", () => {
  it("supports timeline clicks, Raw JSON, and Redaction tabs", async () => {
    const s = await parseClaudeSession(fx("claude/realistic-transcript.jsonl"));
    const html = await fs.readFile(
      await renderReplay(s, { cwd: process.cwd() }),
      "utf8",
    );
    const dom = new JSDOM(html, { runScripts: "dangerously" });
    dom.window.document
      .querySelectorAll<HTMLElement>(".timeline-row")[1]
      .click();
    expect(
      dom.window.document.querySelector("#detailContent")?.textContent,
    ).toContain("Source");
    expect(dom.window.document.querySelector(".coverage-row")).toBeFalsy();
    dom.window.document
      .querySelector<HTMLElement>('[data-tab="Raw JSON"]')
      ?.click();
    expect(
      dom.window.document.querySelector("#detailContent pre")?.textContent,
    ).toContain("title");
    dom.window.document
      .querySelector<HTMLElement>('[data-tab="Redaction"]')
      ?.click();
    expect(
      dom.window.document.querySelector("#detailContent")?.textContent,
    ).toMatch(/No redactions applied|redact/i);
  });

  it("renders the token usage section only for events that carry usage", async () => {
    const s: ParsedSession = {
      provider: "claude",
      sessionPath: "synthetic",
      events: [
        {
          id: "e1",
          provider: "claude",
          type: "user_message",
          title: "User prompt",
        },
        {
          id: "e2",
          provider: "claude",
          type: "assistant_message",
          title: "Assistant reply",
          tokenUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        },
      ],
      warnings: [],
    };
    const html = await fs.readFile(
      await renderReplay(s, { cwd: process.cwd() }),
      "utf8",
    );
    const dom = new JSDOM(html, { runScripts: "dangerously" });
    const rows =
      dom.window.document.querySelectorAll<HTMLElement>(".timeline-row");
    rows[0].click();
    expect(
      dom.window.document.querySelector("#detailContent")?.textContent,
    ).not.toContain("Token usage");
    rows[1].click();
    const detail =
      dom.window.document.querySelector("#detailContent")?.textContent;
    expect(detail).toContain("Token usage");
    expect(detail).not.toContain("Not captured for this event.");
  });
});
