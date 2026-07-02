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
    expect(html).toContain("\\u003cscript");
    expect(html).not.toContain('<script>alert("x")</script>');
  });
  it("uses the light forensic report theme and browser interactions", () => {
    const html = renderSessionBrowser(
      idx([
        {
          ...base,
          id: "c1",
          provider: "claude",
          providerLabel: "Claude",
          outcome: "success",
          title: "Claude run",
          updatedAt: "2026-01-02T00:00:00.000Z",
          changedFiles: ["src/a.ts"],
        },
        {
          ...base,
          id: "x1",
          provider: "codex",
          providerLabel: "Codex",
          outcome: "failed",
          title: "Codex run",
          updatedAt: "2026-01-01T00:00:00.000Z",
          failedCommandCount: 2,
        },
      ]),
    );
    expect(html).toContain("Local investigation index");
    expect(html).toContain("background: linear-gradient(180deg, #eef1f3");
    expect(html).not.toContain("#0f172a");
    expect(html).not.toContain("#071020");
    expect(html).not.toContain("linear-gradient(135deg,#09111f,#17213a)");
    expect(html).not.toContain("color-scheme:light dark");
    expect(html).toContain("provider-badge");
    expect(html).toContain("outcome-pill");
  });

  it("includes safe selected-preview data, filtered count, empty filtered state, and sort", () => {
    const html = renderSessionBrowser(
      idx([
        {
          ...base,
          id: "safe",
          provider: "claude",
          providerLabel: "Claude",
          outcome: "success",
          title: "Safe run",
          changedFiles: ["src/safe.ts"],
          model: "claude-test",
        },
        {
          ...base,
          id: "bad",
          provider: "generic",
          providerLabel: "Generic",
          outcome: "failed",
          title: '<img src=x onerror="alert(1)">',
        },
      ]),
    );
    expect(html).toContain('id="preview"');
    expect(html).toContain("Session preview");
    expect(html).toContain("Open Replay");
    expect(html).toContain("replayCommand");
    expect(html).toContain("Showing ");
    expect(html).toContain(" of ");
    expect(html).toContain(" sessions");
    expect(html).toContain("No sessions match the current filters.");
    expect(html).toContain("Updated newest first");
    expect(html).toContain("Failed commands");
    expect(html).toContain("src/safe.ts");
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
  });

  it("does not render duplicated generic unknown titles", () => {
    const html = renderSessionBrowser(
      idx([
        {
          ...base,
          id: "generic",
          provider: "generic",
          providerLabel: "Generic",
          title: "Unknown event: custom",
        },
      ]),
    );
    expect(html).not.toContain("Unknown Unknown");
    expect(html).toContain("Unknown event: custom");
  });

  it("renders empty state", () => {
    const html = renderSessionBrowser(idx([]));
    expect(html).toContain("No sessions indexed yet");
    expect(html).toContain("Run vfr scan");
  });
});
