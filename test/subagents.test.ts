import { describe, expect, it } from "vitest";
import {
  isSubagentTranscript,
  rollupSubagentTotals,
  subagentParentPath,
  subagentRollup,
} from "../src/index/subagents.js";

const uuid = "018f6e2a-1111-4222-8333-444455556666";

describe("subagent transcript detection", () => {
  it("maps a subagent transcript to its parent transcript path", () => {
    const sub = `/home/u/.claude/projects/foo/${uuid}/subagents/agent-a1b2.jsonl`;
    expect(isSubagentTranscript(sub)).toBe(true);
    expect(subagentParentPath(sub)).toBe(
      `/home/u/.claude/projects/foo/${uuid}.jsonl`,
    );
  });

  it("ignores paths that are not <uuid>/subagents/<name>.jsonl", () => {
    for (const p of [
      `/home/u/.claude/projects/foo/${uuid}.jsonl`,
      "/home/u/projects/subagents/agent-a1b2.jsonl",
      `/home/u/projects/${uuid}/other/agent-a1b2.jsonl`,
      `/home/u/projects/${uuid}/subagents/nested/agent.jsonl`,
      `/home/u/projects/not-a-uuid/subagents/agent.jsonl`,
      `/home/u/projects/${uuid}/subagents/agent.txt`,
    ]) {
      expect(isSubagentTranscript(p), p).toBe(false);
      expect(subagentParentPath(p), p).toBeUndefined();
    }
  });
});

describe("subagent roll-up", () => {
  const parent = {
    sourcePath: `/home/u/.claude/projects/foo/${uuid}.jsonl`,
    tokenCount: 100,
    costUsd: 1,
  };
  const childA = {
    sourcePath: `/home/u/.claude/projects/foo/${uuid}/subagents/a.jsonl`,
    tokenCount: 40,
    costUsd: 0.5,
  };
  const childB = {
    sourcePath: `/home/u/.claude/projects/foo/${uuid}/subagents/b.jsonl`,
  };

  it("sums parent and child tokenCount/costUsd, skipping undefined fields", () => {
    expect(subagentRollup(parent, [parent, childA, childB])).toEqual({
      subagentCount: 2,
      tokenCount: 140,
      costUsd: 1.5,
    });
  });

  it("returns undefined when the session has no subagent children", () => {
    const unrelated = {
      sourcePath: "/home/u/.claude/projects/foo/other.jsonl",
      tokenCount: 7,
    };
    expect(subagentRollup(parent, [parent, unrelated])).toBeUndefined();
  });

  it("keeps totals undefined when no family member carries them", () => {
    expect(rollupSubagentTotals([{}, {}])).toEqual({
      tokenCount: undefined,
      costUsd: undefined,
    });
  });
});
