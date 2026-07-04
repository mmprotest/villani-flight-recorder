import path from "node:path";

const UUID =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const SUBAGENT_RE = new RegExp(
  `(?:^|[\\\\/])(${UUID})[\\\\/]subagents[\\\\/][^\\\\/]+\\.jsonl$`,
);

/**
 * True when a transcript path is a Claude Code subagent transcript, i.e.
 * <parent-session-uuid>/subagents/<name>.jsonl.
 */
export const isSubagentTranscript = (sourcePath: string) =>
  SUBAGENT_RE.test(sourcePath);

/**
 * For a subagent transcript at <base>/<parent-uuid>/subagents/<name>.jsonl,
 * return the parent transcript path <base>/<parent-uuid>.jsonl.
 * Returns undefined for anything that is not a subagent transcript.
 */
export function subagentParentPath(sourcePath: string): string | undefined {
  const m = SUBAGENT_RE.exec(sourcePath);
  if (!m) return undefined;
  const uuidDir = path.dirname(path.dirname(sourcePath));
  return path.join(path.dirname(uuidDir), `${m[1]}.jsonl`);
}

type SessionTotals = {
  sourcePath?: string;
  tokenCount?: number;
  costUsd?: number;
};

export type SubagentRollup = {
  subagentCount: number;
  tokenCount?: number;
  costUsd?: number;
};

/**
 * Combined token and estimated-cost totals across a session family
 * (parent first, then its subagent children). A field stays undefined
 * when no family member carries it.
 */
export function rollupSubagentTotals(family: SessionTotals[]): {
  tokenCount?: number;
  costUsd?: number;
} {
  const tokens = family
    .map((x) => x.tokenCount)
    .filter((n): n is number => typeof n === "number");
  const costs = family
    .map((x) => x.costUsd)
    .filter((n): n is number => typeof n === "number");
  return {
    tokenCount: tokens.length ? tokens.reduce((a, b) => a + b, 0) : undefined,
    costUsd: costs.length ? costs.reduce((a, b) => a + b, 0) : undefined,
  };
}

/**
 * Find the subagent children of a parent session and roll their totals up
 * together with the parent's. Returns undefined when the session has no
 * subagent children.
 */
export function subagentRollup<T extends SessionTotals>(
  parent: T,
  sessions: T[],
): SubagentRollup | undefined {
  if (!parent.sourcePath) return undefined;
  const parentResolved = path.resolve(parent.sourcePath);
  const children = sessions.filter((s) => {
    if (s === parent || !s.sourcePath) return false;
    const pp = subagentParentPath(s.sourcePath);
    return pp !== undefined && path.resolve(pp) === parentResolved;
  });
  if (!children.length) return undefined;
  return {
    subagentCount: children.length,
    ...rollupSubagentTotals([parent, ...children]),
  };
}
