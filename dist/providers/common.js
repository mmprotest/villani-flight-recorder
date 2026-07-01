import { readJsonl } from "../utils/jsonl.js";
import { event, obj, textOf, titleFor } from "../normalize/events.js";
function pick(o, keys) { for (const k of keys)
    if (o[k] != null)
        return o[k]; }
function infer(provider, o) { const warnings = []; const typ = String(pick(o, ["type", "event", "kind", "role", "name"]) ?? "").toLowerCase(); const tool = String(pick(o, ["tool", "tool_name", "name"]) ?? "").toLowerCase(); const content = textOf(pick(o, ["message", "content", "text", "delta", "output", "result"])); const input = obj(pick(o, ["input", "args", "arguments", "parameters"]) ?? {}); const command = String(pick(input, ["command", "cmd", "shell", "bash"]) ?? pick(o, ["command", "cmd"]) ?? ""); const file = String(pick(input, ["file_path", "path", "filename"]) ?? pick(o, ["path", "file_path", "file"]) ?? ""); const extra = { timestamp: String(pick(o, ["timestamp", "created_at", "time", "ts"]) ?? "") || undefined, cwd: String(pick(o, ["cwd", "current_dir", "repo", "repo_path"]) ?? "") || undefined, sessionId: String(pick(o, ["session_id", "sessionId", "conversation_id", "id"]) ?? "") || undefined, summary: content, command: command || undefined, path: file || undefined, stdout: String(pick(o, ["stdout"]) ?? "") || undefined, stderr: String(pick(o, ["stderr", "error"]) ?? "") || undefined }; const code = pick(o, ["exit_code", "exitCode", "status"]); if (typeof code === "number")
    extra.exitCode = code; let type = "unknown"; if (typ.includes("user"))
    type = "user_message";
else if (typ.includes("assistant") || typ.includes("agent"))
    type = "assistant_message";
else if (typ.includes("tool_result") || typ.includes("observation") || typ.includes("result"))
    type = "tool_result";
else if (typ.includes("tool") || tool)
    type = "tool_call";
else if (typ.includes("error") || extra.stderr)
    type = "error"; if (command || tool.includes("bash") || tool.includes("shell") || tool.includes("terminal"))
    type = command.match(/\b(npm|pnpm|yarn|vitest|jest|pytest|cargo|go test)\b/) ? "test_run" : "bash_command"; if (file) {
    if (tool.includes("read") || typ.includes("read"))
        type = "file_read";
    else if (tool.includes("edit") || typ.includes("edit") || typ.includes("patch"))
        type = "file_edit";
    else if (tool.includes("write") || typ.includes("write"))
        type = "file_write";
    else if (tool.includes("delete") || typ.includes("delete"))
        type = "file_delete";
} if (type === "unknown")
    warnings.push("Record shape was not recognized; preserved as unknown event."); return { type, extra, warnings }; }
export async function parseGeneric(provider, path) { const recs = await readJsonl(path); const events = []; const warnings = []; let i = 0; for (const r of recs) {
    if (r.error) {
        const w = `Line ${r.line}: ${r.error}`;
        warnings.push(w);
        events.push(event(`${provider}-${++i}`, provider, "error", "Invalid JSONL line", { raw: r.raw, error: r.error }, { warnings: [w] }));
        continue;
    }
    const o = obj(r.value);
    const got = infer(provider, o);
    warnings.push(...got.warnings.map(w => `Line ${r.line}: ${w}`));
    const e = event(`${provider}-${++i}`, provider, got.type, titleFor(got.type, got.extra), r.value, { ...got.extra, warnings: got.warnings });
    events.push(e);
} const first = events.find(e => e.sessionId || e.cwd || e.timestamp); return { provider, path, sessionId: first?.sessionId, cwd: first?.cwd, startedAt: events.find(e => e.timestamp)?.timestamp, endedAt: [...events].reverse().find(e => e.timestamp)?.timestamp, model: String((obj(recs.find(r => r.value)?.value).model) ?? "") || undefined, events, warnings }; }
