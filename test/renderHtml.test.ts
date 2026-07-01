import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { parseCodexSession } from "../src/providers/codex.js";
import { renderReplay } from "../src/render/renderReplay.js";
import { safeJsonForScript } from "../src/render/safeHtml.js";
const fx = (p: string) => path.resolve("test/fixtures", p);

describe("rendered HTML", () => {
  it("contains cockpit UI, status sections, self-contained assets, and valid inline JS", async () => {
    const s = await parseCodexSession(fx("codex/realistic-rollout.jsonl"));
    const html = await fs.readFile(
      await renderReplay(s, { cwd: process.cwd() }),
      "utf8",
    );
    for (const text of [
      "Villani Flight Recorder",
      "Replay Event Timeline",
      "Execution Graph",
      "STATUS",
      "REPLAY",
      "CAPTURED",
      "Commands / Tools",
      "Replay Output",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain(">Validate<");
    expect(html).not.toContain(">Review<");
    expect(html).not.toContain(">Finalize<");
    expect(html).not.toContain("Live Updates");
    expect(html).not.toContain("Streaming");
    expect(html).not.toContain("82%");
    expect(html).not.toMatch(/https?:\/\//);
    for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))
      expect(() => new vm.Script(match[1])).not.toThrow();
  });

  it("safeJsonForScript escapes closing script tags", () => {
    expect(safeJsonForScript({ x: "</script>" })).toContain("\\u003c/script");
  });
});
