import path from "node:path";
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const SUBAGENT_RE = new RegExp(`(?:^|[\\\\/])(${UUID})[\\\\/]subagents[\\\\/][^\\\\/]+\\.jsonl$`);
/**
 * True when a transcript path is a Claude Code subagent transcript, i.e.
 * <parent-session-uuid>/subagents/<name>.jsonl.
 */
export const isSubagentTranscript = (sourcePath) => SUBAGENT_RE.test(sourcePath);
/**
 * For a subagent transcript at <base>/<parent-uuid>/subagents/<name>.jsonl,
 * return the parent transcript path <base>/<parent-uuid>.jsonl.
 * Returns undefined for anything that is not a subagent transcript.
 */
export function subagentParentPath(sourcePath) {
    const m = SUBAGENT_RE.exec(sourcePath);
    if (!m)
        return undefined;
    const uuidDir = path.dirname(path.dirname(sourcePath));
    return path.join(path.dirname(uuidDir), `${m[1]}.jsonl`);
}
