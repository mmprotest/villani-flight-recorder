import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { promisify } from "node:util";
import { readJsonl } from "../src/utils/jsonl.js";
import { parseClaudeSession } from "../src/providers/claude.js";
import { parseCodexSession } from "../src/providers/codex.js";
import { parsePiSession } from "../src/providers/pi.js";
import { parseGeneric } from "../src/providers/generic.js";
import { redactString } from "../src/redaction/redact.js";
import { buildGitReplay } from "../src/git/gitReplay.js";
import { renderReplay } from "../src/render/renderReplay.js";
import { defaultRoots, findSessions } from "../src/scanners/findSessions.js";
import { appendHook } from "../src/hooks/installHooks.js";
const exec = promisify(execFile);
const fx = (p: string) => path.resolve("test/fixtures", p);

describe("provider parsers", () => {
  it("jsonl invalid lines warn and unknown valid records are preserved", async () => {
    const s = await parseGeneric("unknown", fx("generic/mixed-invalid.jsonl"));
    expect(s.warnings[0]).toContain("Line 2");
    expect(s.events.some((e) => e.type === "unknown")).toBe(true);
  });
  it("claude extracts messages, tools, results, hooks", async () => {
    const s = await parseClaudeSession(fx("claude/realistic-transcript.jsonl"));
    expect(s.sessionId).toBe("claude-realistic-1");
    expect(s.model).toContain("claude");
    expect(
      s.events.some(
        (e) => e.type === "user_message" && e.summary === "Fix the tests",
      ),
    ).toBe(true);
    expect(
      s.events.some(
        (e) => e.type === "assistant_message" && e.summary?.includes("inspect"),
      ),
    ).toBe(true);
    expect(
      s.events.some((e) => e.type === "test_run" && e.command === "npm test"),
    ).toBe(true);
    expect(
      s.events.some((e) => e.type === "file_read" && e.path === "src/index.ts"),
    ).toBe(true);
    expect(
      s.events.some((e) => e.type === "file_edit" && e.path === "src/index.ts"),
    ).toBe(true);
    expect(
      s.events.some((e) => e.type === "file_write" && e.path === "src/new.ts"),
    ).toBe(true);
    expect(
      s.events.some((e) => e.type === "error" && e.summary === "Tests failed"),
    ).toBe(true);
    expect(s.events.some((e) => e.title === "Searched with Grep")).toBe(true);
    expect(
      s.events.some((e) => e.title === "Unknown Claude event: message_delta"),
    ).toBe(true);
    const h = await parseClaudeSession(fx("claude/hook-payload.jsonl"));
    expect(h.events[0].title).toBe("Claude hook: PostToolUse Bash");
  });
  it("codex extracts metadata, shell, apply_patch, approvals, hooks", async () => {
    const s = await parseCodexSession(fx("codex/realistic-rollout.jsonl"));
    expect(s.sessionId).toBe("sess_123");
    expect(s.model).toBe("gpt-5-codex");
    expect(
      s.events.some((e) => e.type === "test_run" && e.command === "npm test"),
    ).toBe(true);
    expect(
      s.events.some((e) => e.type === "file_edit" && e.path === "src/index.ts"),
    ).toBe(true);
    expect(s.events.some((e) => e.type === "approval")).toBe(true);
    expect(
      s.events.some(
        (e) => e.title === "Unknown Codex event: response_item_done",
      ),
    ).toBe(true);
    const h = await parseCodexSession(fx("codex/hook-payload.jsonl"));
    expect(h.events[0].title).toBe("Codex hook: PreToolUse bash");
  });
  it("pi extracts execution lifecycle, failures, summaries, model changes", async () => {
    const s = await parsePiSession(fx("pi/realistic-session.jsonl"));
    expect(s.sessionId).toBe("pi_123");
    expect(s.model).toBe("qwen3.6-27b");
    expect(
      s.events.some(
        (e) => e.type === "user_message" && e.summary === "Fix the repo",
      ),
    ).toBe(true);
    expect(s.events.some((e) => e.title === "Pi tool started: bash")).toBe(
      true,
    );
    expect(
      s.events.some((e) => e.type === "error" && e.command === "npm test"),
    ).toBe(true);
    expect(s.events.some((e) => e.title === "Branch summary")).toBe(true);
    expect(
      s.events.some(
        (e) => e.title === "Model changed: qwen3.5-9b to qwen3.6-27b",
      ),
    ).toBe(true);
    expect(
      s.events.some((e) => e.title === "Unknown Pi event: compaction"),
    ).toBe(true);
  });
});

describe("cli support", () => {
  it("scanner respects provider, rejects root without provider, and deduplicates codex roots", async () => {
    await expect(findSessions({ roots: [fx("claude")] })).rejects.toThrow(
      /--root requires --provider/,
    );
    const s = await findSessions({ roots: [fx("claude")], provider: "claude" });
    expect(s.every((x) => x.provider === "claude")).toBe(true);
    const old = process.env.CODEX_HOME;
    process.env.CODEX_HOME = path.join(os.homedir(), ".codex");
    expect(defaultRoots("codex")).toHaveLength(1);
    process.env.CODEX_HOME = path.join(os.tmpdir(), "not_named_home");
    expect(defaultRoots("codex")[0].root).toContain("not_named_home");
    process.env.CODEX_HOME = old;
  });
  it("hook ingestion writes jsonl safely and rejects invalid json", async () => {
    const d = await fs.mkdtemp(path.join(os.tmpdir(), "vfr-hook-"));
    const file = await appendHook("claude", '{"session_id":"abc","x":1}\n', d);
    expect(file).toContain(".villani-flight-recorder");
    expect(await fs.readFile(file, "utf8")).toContain('"provider":"claude"');
    await expect(appendHook("claude", "not-json", d)).rejects.toThrow(
      /Invalid JSON/,
    );
  });
  it("redacts required secret categories and no-redact can preserve rendered content", async () => {
    const secret =
      "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890 Bearer abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz.abcdefghijklmnopqrstuvwxyz ghp_abcdefghijklmnopqrstuvwxyz123456 DATABASE_URL=postgres://u:p@example/db PASSWORD=hunter2 npm_abcdefghijklmnopqrstuvwxyz123456 AKIAABCDEFGHIJKLMNOP AIzaabcdefghijklmnopqrstuvwxyz -----BEGIN PRIVATE KEY-----abc-----END PRIVATE KEY----- AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdefABCDEF";
    const red = redactString(secret);
    expect(red).toContain("[REDACTED_ENV_VALUE]");
    expect(red).toContain("[REDACTED_TOKEN]");
    expect(red).toContain("[REDACTED_PRIVATE_KEY]");
    expect(red).toContain("[REDACTED_CONNECTION_STRING]");
    expect(red).toContain("[REDACTED_SECRET]");
  });
  it("replay html renders the operational cockpit self-contained with valid inline javascript", async () => {
    const s = await parseCodexSession(fx("codex/realistic-rollout.jsonl"));
    const htmlPath = await renderReplay(s, { cwd: process.cwd() });
    const html = await fs.readFile(htmlPath, "utf8");
    expect(html).toContain("Villani Flight Recorder");
    expect(html).toContain("Replay Event Timeline");
    expect(html).toContain("Execution Graph");
    expect(html).toContain("Event Detail");
    expect(html).toContain("Changed Files");
    expect(html).toContain("Diff");
    expect(html).toContain("Raw JSON");
    expect(html).toContain("Warnings");
    expect(html).toContain("Redaction");
    expect(html).toContain("TASK");
    expect(html).toContain("MODEL");
    expect(html).toContain("RUNNER");
    expect(html).toContain("TOKENS");
    expect(html).toContain("COST (USD)");
    expect(html).toContain("STATUS");
    expect(html).toContain("DURATION");
    expect(html).toContain("RUN ID");
    expect(html).toContain("Discover");
    expect(html).toContain("Parse");
    expect(html).toContain("Normalize");
    expect(html).toContain("Correlate");
    expect(html).toContain("Session Events");
    expect(html).toContain("Git State");
    expect(html).toContain("Diff Capture");
    expect(html).toContain("Validate");
    expect(html).toContain("Review");
    expect(html).toContain("Finalize");
    expect(html).toContain("graph-links");
    expect(html).toContain('marker id="arrow-completed"');
    expect(html).toContain("Ran npm test");
    expect(html).toContain("detailContent");
    expect(html).toContain("Initial Event Detail");
    expect(html).not.toContain("Live Updates");
    expect(html).not.toContain("Streaming");
    expect(html).not.toContain("82%");
    expect(html).not.toMatch(/Validate[\s\S]{0,400}running/i);
    expect(html).not.toMatch(/https?:\/\//);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
      (match) => match[1],
    );
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(() => new vm.Script(script)).not.toThrow();
    }
    const dom = new JSDOM(html, { runScripts: "dangerously" });
    expect(
      dom.window.document.querySelector(".timeline-row.selected"),
    ).toBeTruthy();
    const secondRow =
      dom.window.document.querySelectorAll<HTMLElement>(".timeline-row")[1];
    secondRow.click();
    expect(secondRow.classList.contains("selected")).toBe(true);
    expect(
      dom.window.document.querySelector("#detailContent")?.textContent,
    ).toContain("Provider/Runner");
    const graphNode =
      dom.window.document.querySelectorAll<HTMLElement>(".graph-node")[2];
    graphNode.click();
    expect(graphNode.classList.contains("selected")).toBe(true);
    expect(
      dom.window.document.querySelector("#detailContent")?.textContent,
    ).toContain("Normalize");
    dom.window.document
      .querySelector<HTMLElement>('[data-tab="Raw JSON"]')
      ?.click();
    expect(
      dom.window.document.querySelector("#detailContent pre")?.textContent,
    ).toContain("title");
    const warningNode = [
      ...dom.window.document.querySelectorAll(".graph-node.warning"),
    ]
      .map((n) => n.textContent)
      .join(" ");
    expect(warningNode).not.toMatch(/RUNNING/i);
  });
  it("git replay works in a temporary git repo and CLI invalid input exits nonzero", async () => {
    const d = await fs.mkdtemp(path.join(os.tmpdir(), "vfr-"));
    await exec("git", ["init"], { cwd: d });
    await exec("git", ["config", "user.email", "a@b.c"], { cwd: d });
    await exec("git", ["config", "user.name", "A"], { cwd: d });
    await fs.writeFile(path.join(d, "a.test.ts"), "a");
    await exec("git", ["add", "."], { cwd: d });
    await exec("git", ["commit", "-m", "first"], { cwd: d });
    await fs.writeFile(path.join(d, "package.json"), "{}");
    await exec("git", ["add", "."], { cwd: d });
    await exec("git", ["commit", "-m", "second"], { cwd: d });
    const s = await buildGitReplay("HEAD~1", "HEAD", d);
    expect(
      s.events.some((e) => e.summary?.includes("dependency file changed")),
    ).toBe(true);
    await expect(
      exec("node", ["dist/cli.js", "replay"], { cwd: process.cwd() }),
    ).rejects.toBeTruthy();
  });
});
