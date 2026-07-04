import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  extractTokenUsage,
  sumTokenUsage,
} from "../src/providers/helpers/tokens.js";
import { parseClaudeSession } from "../src/providers/claude.js";
import { parseGeneric } from "../src/providers/generic.js";
import { clientScript } from "../src/render/clientScript.js";
import { renderSessionBrowser } from "../src/render/sessionBrowser.js";
import { deriveMetrics } from "../src/render/deriveMetrics.js";
import { SessionIndex } from "../src/index/sessionTypes.js";

async function fixture(lines: unknown[]) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vfr-tokens-"));
  const file = path.join(dir, "session.jsonl");
  await fs.writeFile(file, lines.map((l) => JSON.stringify(l)).join("\n"));
  return file;
}

describe("token telemetry", () => {
  it("extracts Claude and OpenAI/Codex style usage", () => {
    expect(
      extractTokenUsage({
        message: { usage: { input_tokens: 10, output_tokens: 5 } },
      })?.totalTokens,
    ).toBe(15);
    expect(
      extractTokenUsage({
        usage: {
          prompt_tokens: "7",
          completion_tokens: 3,
          reasoning_tokens: 2,
        },
      }),
    ).toMatchObject({
      inputTokens: 7,
      outputTokens: 3,
      reasoningTokens: 2,
      totalTokens: 12,
    });
  });

  it("attaches Claude usage once when assistant text and tool_use split children exist", async () => {
    const file = await fixture([
      {
        type: "assistant",
        session_id: "s",
        message: {
          role: "assistant",
          model: "claude-3",
          usage: { input_tokens: 100, output_tokens: 20 },
          content: [
            { type: "text", text: "I'll inspect." },
            {
              type: "tool_use",
              id: "toolu_1",
              name: "Bash",
              input: { command: "pwd" },
            },
          ],
        },
      },
    ]);
    const s = await parseClaudeSession(file);
    expect(
      s.events.find((e) => e.type === "assistant_message")?.tokenUsage
        ?.totalTokens,
    ).toBe(120);
    expect(sumTokenUsage(s.events)?.totalTokens).toBe(120);
  });

  it("counts usage once when streaming re-emits records with the same message.id", async () => {
    const message = {
      role: "assistant",
      id: "msg_1",
      model: "claude-3",
      usage: { input_tokens: 100, output_tokens: 20 },
    };
    const file = await fixture([
      {
        type: "assistant",
        session_id: "s",
        message: {
          ...message,
          content: [{ type: "text", text: "I'll inspect." }],
        },
      },
      {
        type: "assistant",
        session_id: "s",
        message: {
          ...message,
          usage: { input_tokens: 100, output_tokens: 35 },
          content: [
            {
              type: "tool_use",
              id: "toolu_1",
              name: "Bash",
              input: { command: "pwd" },
            },
          ],
        },
      },
    ]);
    const s = await parseClaudeSession(file);
    // Only the last re-emission carries usage, with its updated numbers.
    expect(sumTokenUsage(s.events)?.totalTokens).toBe(135);
  });

  it("attaches Claude usage to first tool child when no text event is emitted", async () => {
    const file = await fixture([
      {
        type: "assistant",
        session_id: "s",
        message: {
          role: "assistant",
          model: "claude-3",
          usage: { input_tokens: 9, output_tokens: 1 },
          content: [
            {
              type: "tool_use",
              id: "toolu_1",
              name: "Bash",
              input: { command: "pwd" },
            },
          ],
        },
      },
    ]);
    const s = await parseClaudeSession(file);
    expect(s.events).toHaveLength(1);
    expect(s.events[0].tokenUsage?.totalTokens).toBe(10);
  });

  it("attaches generic usage and renders replay/event token states", async () => {
    const file = await fixture([
      { type: "assistant", content: "hello", usage: { total_tokens: 42 } },
      { type: "user", content: "no usage" },
    ]);
    const s = await parseGeneric("unknown", file);
    expect(s.events[0].tokenUsage?.totalTokens).toBe(42);
    expect(
      deriveMetrics(
        s,
        { label: "ok", tone: "success", reason: "ok" },
        { label: "ok", tone: "success", reason: "ok" },
      ).find((m) => m.id === "tokens")?.value,
    ).toBe("42");
    const script = clientScript();
    expect(script).toContain("Token usage");
    // Events without usage render no token section at all.
    expect(script).not.toContain("Not captured for this event.");
    expect(script).toContain("if(!u)return ''");
  });

  it("prefers stored index stats over live recompute and falls back when absent", async () => {
    const file = await fixture([
      { type: "assistant", content: "hello", usage: { total_tokens: 42 } },
    ]);
    const s = await parseGeneric("unknown", file);
    const ok = { label: "ok", tone: "success", reason: "ok" } as const;
    const metrics = deriveMetrics(s, ok, ok, {
      tokenCount: 500,
      inputTokenCount: 300,
      outputTokenCount: 200,
      costUsd: 1.5,
      model: "claude-sonnet-5",
      subagents: { subagentCount: 2, tokenCount: 700, costUsd: 2 },
    });
    const tokens = metrics.find((m) => m.id === "tokens");
    expect(tokens?.value).toBe("500");
    expect(tokens?.subvalue).toContain("input 300");
    expect(tokens?.subvalue).toContain("output 200");
    const cost = metrics.find((m) => m.id === "cost");
    expect(cost?.value).toBe("$1.50");
    expect(cost?.label).toBe("EST. COST (USD)");
    expect(metrics.find((m) => m.id === "model")?.value).toBe(
      "claude-sonnet-5",
    );
    expect(metrics.find((m) => m.id === "subagents")?.value).toBe(
      "incl. 2 subagents: 700 tokens / $2.00",
    );
    // Undefined index fields fall back to the live recompute from events.
    for (const fallback of [undefined, {}]) {
      const m = deriveMetrics(s, ok, ok, fallback);
      expect(m.find((x) => x.id === "tokens")?.value).toBe("42");
      expect(m.find((x) => x.id === "subagents")).toBeUndefined();
    }
  });

  it("renders session browser token count", () => {
    const index: SessionIndex = {
      version: 1,
      generatedAt: "now",
      warnings: [],
      repos: [],
      taskSegments: [],
      sessions: [
        {
          id: "s",
          provider: "generic",
          providerLabel: "Generic",
          sourcePath: "/tmp/s.jsonl",
          sourceKind: "file",
          eventCount: 2,
          repoRoots: [],
          repoIds: [],
          taskSegmentIds: [],
          commandCount: 0,
          failedCommandCount: 0,
          fileEventCount: 0,
          warningCount: 0,
          fingerprint: {},
          confidence: "high",
          warnings: [],
          tokenCount: 193000,
        },
      ],
    };
    expect(renderSessionBrowser(index)).toContain("193k");
  });
});
