import { describe, expect, it } from "vitest";
import fs, { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { parseClaudeSession } from "../src/providers/claude.js";
import { parseCodexSession } from "../src/providers/codex.js";
import { renderReplay } from "../src/render/renderReplay.js";
import { safeJsonForScript } from "../src/render/safeHtml.js";
import { deriveTimeline } from "../src/render/deriveTimeline.js";
const fx = (p: string) => path.resolve("test/fixtures", p);

describe("rendered HTML", () => {
  it("contains forensic report UI, status sections, self-contained assets, and valid inline JS", async () => {
    const s = await parseCodexSession(fx("codex/realistic-rollout.jsonl"));
    const html = await fs.readFile(
      await renderReplay(s, { cwd: process.cwd() }),
      "utf8",
    );
    for (const text of [
      "Villani Flight Recorder",
      "Replay Event Timeline",
      "Replay coverage",
      "Captured run outcome",
      "events captured",
      "provider",
      "Commands",
      "Replay Output",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain(">Validate<");
    expect(html).not.toContain(">Review<");
    expect(html).not.toContain(">Finalize<");
    expect(html).not.toContain("Live Updates");
    expect(html).not.toContain("Streaming");
    expect(html).not.toContain("82%");
    expect(html).not.toContain("Commands / Tools</b>");
    for (const longGraphCopy of [
      "Replay HTML written with recorder warnings",
      "Repository correlation unavailable",
      "No git diff captured",
      "Not a git repository",
      "Events, 1 unknown",
    ]) {
      expect(html).not.toContain(longGraphCopy);
    }
    expect(html).toContain("Generated with warnings");
    expect(html).toContain("Failed: 1 failed test");
    expect(html).not.toContain("Failed, 1 failed tests");
    expect(html).toContain("Recorder Pipeline");
    expect(html).toContain("Captured Run");
    expect(html).toContain("Repository");
    expect(html).toContain("Design tokens");
    expect(html).toContain("Investigation report layout");
    expect(html).toContain("Replay coverage");
    expect(html).toContain("Detail panel");
    expect(html).not.toMatch(/https?:\/\//);
    for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))
      expect(() => new vm.Script(match[1])).not.toThrow();
  });

  it("renders structured timeline, graph, detail tabs, and interactions", async () => {
    const s = await parseClaudeSession(fx("claude/realistic-transcript.jsonl"));
    const html = await fs.readFile(
      await renderReplay(s, { cwd: process.cwd() }),
      "utf8",
    );
    const dom = new JSDOM(html, { runScripts: "dangerously" });
    const doc = dom.window.document;
    const times = [...doc.querySelectorAll(".timeline-time")].map(
      (n) => n.textContent ?? "",
    );
    expect(times.length).toBeGreaterThan(0);
    expect(
      times.every((t) => !t.includes("T") && !/\d{4}-\d{2}-\d{2}/.test(t)),
    ).toBe(true);
    expect(doc.querySelectorAll(".graph-node-title").length).toBeGreaterThan(0);
    expect(doc.querySelector(".run-summary h2")?.textContent).toMatch(
      /Failed|Succeeded|Warning|Not applicable/,
    );
    expect(doc.querySelector(".graph-stage")).toBeTruthy();
    expect(html).toContain("z-index: 1");
    expect(
      [...doc.querySelectorAll(".graph-node-title")].some(
        (n) => n.textContent === "Commands",
      ),
    ).toBe(true);
    expect(
      [...doc.querySelectorAll(".graph-node-subtitle")].some((n) =>
        /Tools and tests|failed test|failed cmd|No commands|No command/.test(
          n.textContent ?? "",
        ),
      ),
    ).toBe(true);
    expect(
      [...doc.querySelectorAll(".graph-node-title")].some(
        (n) => n.textContent === "Commands / Tools",
      ),
    ).toBe(false);
    expect(doc.body.textContent).toContain("Source");
    expect(doc.body.textContent).toContain("Replay coverage");
    expect(doc.body.textContent).toContain("Issue");
    expect(html).not.toContain("N/A NO REPO");
    expect(html).toContain("@media (max-width: 900px)");
    expect(html).toContain("@media (max-width: 520px)");
    expect(html).toContain("@media (max-width: 700px)");
    expect(html).toContain("mobile-diagnostic-list");
    expect(html).not.toContain(
      "Captured agent-run evidence is prioritized below",
    );

    const failed = [
      ...doc.querySelectorAll<HTMLElement>("[data-event-index]"),
    ].find(
      (n) =>
        n.textContent?.includes("Test failed") ||
        n.textContent?.includes("Command failed"),
    );
    failed?.click();
    expect(doc.querySelector("#detailContent")?.textContent).toContain(
      "Captured agent run",
    );
    expect(doc.querySelector("#detailContent")?.textContent).toContain(
      "The replay was generated successfully, but the captured agent command failed.",
    );
    expect(doc.querySelector("#detailContent")?.textContent).not.toContain(
      "captured run contains a failed command",
    );
    expect(html).not.toContain(
      ["None", "replay generated successfully"].join(", "),
    );
    expect(doc.querySelector("#detailContent .metadata-strip")).toBeTruthy();
    expect(
      doc.querySelector("#detailContent .metadata-label")?.textContent,
    ).toBeTruthy();
    expect(
      doc.querySelector("#detailContent .metadata-value")?.textContent,
    ).toBeTruthy();
    const detailLayout = doc.querySelector(
      "#detailContent .detail-event-layout",
    );
    const children = [...(detailLayout?.children ?? [])].map(
      (n) => (n as Element).className,
    );
    expect(
      children.findIndex((c) => c.includes("investigation-grid")),
    ).toBeLessThan(children.findIndex((c) => c.includes("metadata-strip")));

    doc.querySelector<HTMLElement>("[data-graph-index]")?.click();
    expect(doc.querySelector("#detailContent")?.textContent).toContain(
      "Coverage diagnostic",
    );
    [...doc.querySelectorAll<HTMLElement>(".tab")]
      .find((n) => n.dataset.tab === "Raw JSON")
      ?.click();
    expect(doc.querySelector("#detailContent pre")?.textContent).toContain(
      "id",
    );
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

  it("groups adjacent command start and result events into one timeline item", async () => {
    const session = await parseCodexSession(
      fx("codex/realistic-rollout.jsonl"),
    );
    const timeline = deriveTimeline(session.events);
    const npmTestItems = timeline.filter((e) => e.raw.command === "npm test");
    expect(npmTestItems).toHaveLength(1);
    expect(npmTestItems[0]?.status).toBe("failed");
    expect(npmTestItems[0]?.title).toBe("Command failed: npm test");
    expect(npmTestItems[0]?.raw.raw).toMatchObject({
      kind: "grouped_command_lifecycle",
    });
  });

  it("groups Claude command start and failed result into one primary item with raw metadata", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "vfr-claude-group-"));
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
                id: "toolu_test_group",
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
                tool_use_id: "toolu_test_group",
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
    const npmTestItems = timeline.filter((e) => e.raw.command === "npm test");
    expect(npmTestItems).toHaveLength(1);
    expect(npmTestItems[0]?.title).toBe("Command failed: npm test");
    expect(npmTestItems[0]?.raw.exitCode).toBe(1);
    expect(npmTestItems[0]?.raw.raw).toMatchObject({
      kind: "grouped_command_lifecycle",
      command: "npm test",
      exitCode: 1,
    });

    const html = await fs.readFile(
      await renderReplay(session, { cwd: process.cwd() }),
      "utf8",
    );
    const doc = new JSDOM(html, { runScripts: "dangerously" }).window.document;
    const primaryRows = [...doc.querySelectorAll(".timeline-title")].map(
      (n) => n.textContent ?? "",
    );
    expect(primaryRows.filter((t) => t.includes("npm test"))).toEqual([
      "Command failed: npm test",
    ]);
    expect(primaryRows).not.toContain("Ran npm test");
    expect(primaryRows).not.toContain("Test failed: npm test");
    expect(doc.body.textContent).toContain("Exit code");
    expect(doc.body.textContent).toContain("1");
    expect(doc.body.textContent).toContain("grouped_command_lifecycle");
  });
});
