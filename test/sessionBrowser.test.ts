import { describe, expect, it } from "vitest";
import { renderSessionBrowser } from "../src/render/sessionBrowser.js";
import { SessionIndex } from "../src/index/sessionTypes.js";

function idx(sessions: SessionIndex["sessions"]): SessionIndex {
  return {
    version: 1,
    generatedAt: "now",
    sessions,
    taskSegments: [],
    repos: [],
    warnings: [],
  };
}
const base = {
  sourceKind: "file" as const,
  sourceType: "transcript" as const,
  eventCount: 2,
  repoRoots: [],
  repoIds: [],
  taskSegmentIds: [],
  commandCount: 0,
  failedCommandCount: 0,
  fileEventCount: 0,
  warningCount: 0,
  fingerprint: {},
  confidence: "high" as const,
  warnings: [],
  indexedAt: "now",
  sourcePath: "/tmp/a.jsonl",
};

describe("session browser", () => {
  it("renders sessions", () => {
    const html = renderSessionBrowser(
      idx([
        {
          ...base,
          id: "c1",
          provider: "claude",
          providerLabel: "Claude",
          outcome: "success",
          title: "Claude run",
        },
        {
          ...base,
          id: "x1",
          provider: "codex",
          providerLabel: "Codex",
          outcome: "failed",
          title: "Codex run",
        },
      ]),
    );
    expect(html).toContain("Villani Flight Recorder");
    expect(html).toContain("Local coding-agent sessions");
    expect(html).toContain("Claude");
    expect(html).toContain("Codex");
    expect(html).toContain("Open Replay");
  });
  it("includes filters", () => {
    const html = renderSessionBrowser(idx([]));
    for (const text of [
      "All Agents",
      "Claude",
      "Codex",
      "Pi",
      "Generic",
      "Failed",
      "Success",
      "Unknown",
    ])
      expect(html).toContain(text);
  });
  it("escapes session content", () => {
    const html = renderSessionBrowser(
      idx([
        {
          ...base,
          id: "bad",
          provider: "generic",
          providerLabel: "Generic",
          title: '<script>alert("x")</script>',
        },
      ]),
    );
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).not.toContain('<script>alert("x")</script>');
  });
  it("renders empty state", () => {
    const html = renderSessionBrowser(idx([]));
    expect(html).toContain("No sessions indexed yet");
    expect(html).toContain("Run vfr scan");
  });
});
