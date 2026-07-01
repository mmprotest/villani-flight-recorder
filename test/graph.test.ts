import { describe, expect, it } from "vitest";
import path from "node:path";
import { parseClaudeSession } from "../src/providers/claude.js";
import { parsePiSession } from "../src/providers/pi.js";
import { deriveExecutionGraph } from "../src/render/deriveGraph.js";
const fx = (p: string) => path.resolve("test/fixtures", p);

describe("execution graph", () => {
  it("contains lane graph nodes and links without old phases", async () => {
    const s = await parseClaudeSession(fx("claude/realistic-transcript.jsonl"));
    const graph = deriveExecutionGraph({ session: s, git: null });
    expect(graph.nodes.map((n) => n.title)).toEqual([
      "Discover",
      "Parse",
      "Normalize",
      "Correlate",
      "Agent Events",
      "Commands / Tools",
      "File Changes",
      "Git State",
      "Diff Capture",
      "Replay Output",
    ]);
    expect(graph.links.map((l) => `${l.from}:${l.to}`)).toContain(
      "correlate:replay-output",
    );
    expect(graph.nodes.find((n) => n.title === "Validate")).toBeUndefined();
    expect(graph.nodes.find((n) => n.title === "Review")).toBeUndefined();
    expect(graph.nodes.find((n) => n.title === "Finalize")).toBeUndefined();
  });

  it("maps captured failures and unavailable git correctly", async () => {
    const s = await parsePiSession(fx("pi/realistic-session.jsonl"));
    const graph = deriveExecutionGraph({ session: s, git: null });
    expect(graph.nodes.find((n) => n.id === "commands")?.status).toBe("failed");
    expect(graph.nodes.find((n) => n.id === "replay-output")?.status).not.toBe(
      "failed",
    );
    expect(graph.nodes.find((n) => n.id === "git-state")?.severity).toBe(
      "unavailable",
    );
  });
});
