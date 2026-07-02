import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanToIndex } from "../src/index/sessionIndex.js";
import { readIndex } from "../src/index/sessionStore.js";
import { renderReplay } from "../src/render/renderReplay.js";

describe("session index launch flow", () => {
  it("scans fixture roots, stores sessions, tasks, and replays an indexed segment", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vfr-index-"));
    const result = await scanToIndex({
      agent: "claude",
      roots: ["test/fixtures/claude"],
      indexDir: dir,
    });
    expect(result.index.sessions.length).toBeGreaterThan(0);
    expect(result.index.taskSegments.length).toBeGreaterThan(0);
    expect((await readIndex(dir))?.sessions.length).toBe(
      result.index.sessions.length,
    );
    const rec = result.index.sessions[0];
    const seg = result.index.taskSegments.find((t) => t.sessionId === rec.id)!;
    const { claudeAdapter } =
      await import("../src/providers/providerAdapter.js");
    const parsed = await claudeAdapter.parse({
      provider: rec.provider,
      sourcePath: rec.sourcePath,
      sourceKind: "file",
      confidence: rec.confidence,
      reason: "test",
    });
    parsed.events = parsed.events.slice(
      seg.startEventIndex,
      seg.endEventIndex + 1,
    );
    const out = await renderReplay(
      { ...parsed, sessionPath: rec.sourcePath, path: rec.sourcePath },
      { out: path.join(dir, "replay.html") },
    );
    expect(await fs.readFile(out, "utf8")).toContain("Villani Flight Recorder");
  });
});
