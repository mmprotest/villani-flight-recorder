export function event(id, provider, type, title, raw, extra = {}) { return { id, provider, type, title, raw, ...extra }; }
export function textOf(v) { if (typeof v === "string")
    return v; if (Array.isArray(v))
    return v.map(textOf).filter(Boolean).join("\n") || undefined; if (v && typeof v === "object") {
    const o = v;
    return textOf(o.text ?? o.content ?? o.message ?? o.output);
} return undefined; }
export function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
export function titleFor(type, e) { if (type === "user_message")
    return "User prompt"; if (type === "assistant_message")
    return "Assistant response"; if (type === "bash_command")
    return `Ran ${e.command ?? "shell command"}`; if (type === "file_read")
    return `Read ${e.path ?? "file"}`; if (type === "file_write")
    return `Wrote ${e.path ?? "file"}`; if (type === "file_edit")
    return `Edited ${e.path ?? "file"}`; if (type === "tool_call")
    return `Tool call${e.summary ? `: ${e.summary}` : ""}`; if (type === "tool_result")
    return "Tool result"; if (type === "error")
    return "Error"; if (type === "git_commit")
    return `Commit ${e.summary ?? ""}`.trim(); return type.replaceAll("_", " "); }
