import { describe, expect, it } from "vitest";
import fs, { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { parseClaudeSession } from "../src/providers/claude.js";
import { parseCodexSession } from "../src/providers/codex.js";
import { renderReplay } from "../src/render/renderReplay.js";
import { safeJsonForScript } from "../src/render/safeHtml.js";
import { deriveTimeline } from "../src/render/deriveTimeline.js";
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

describe("timeline correlated command failures", () => {
  it("labels Claude failed Bash tool results as captured command failures", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "vfr-timeline-"));
    const file = path.join(dir, "session.jsonl");
    await writeFile(
      file,
      [
        JSON.stringify({
          type: "assistant",
          message: {
            role: "assistant",
            content: [
              {
                type: "tool_use",
                id: "toolu_test_1",
                name: "Bash",
                input: { command: "npm test" },
              },
            ],
          },
        }),
        JSON.stringify({
          type: "user",
          message: {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: "toolu_test_1",
                content: "Tests failed",
                is_error: true,
              },
            ],
          },
        }),
      ].join("\n"),
    );
    const session = await parseClaudeSession(file);
    const timeline = deriveTimeline(session.events);
    const failed = timeline.find(
      (e) => e.raw.command === "npm test" && e.status === "failed",
    );
    expect(failed?.title).toMatch(/failed/i);
    expect(failed?.subtitle).toMatch(/captured/i);
    expect(failed?.title).not.toBe("Transcript parsed with warnings");
  });
});
