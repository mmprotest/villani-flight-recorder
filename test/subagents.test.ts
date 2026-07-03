import { describe, expect, it } from "vitest";
import {
  isSubagentTranscript,
  subagentParentPath,
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
