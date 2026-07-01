const patterns = [[/sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, "[REDACTED_SECRET]"], [/sk-ant-[A-Za-z0-9_-]{20,}/g, "[REDACTED_SECRET]"], [/gh[pousr]_[A-Za-z0-9_]{20,}/g, "[REDACTED_TOKEN]"], [/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED_TOKEN]"], [/AKIA[0-9A-Z]{16}/g, "[REDACTED_SECRET]"], [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_TOKEN]"], [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_SECRET]"], [/^([A-Z0-9_]*SECRET[A-Z0-9_]*|[A-Z0-9_]*TOKEN[A-Z0-9_]*|[A-Z0-9_]*KEY[A-Z0-9_]*)=.+$/gmi, "$1=[REDACTED_ENV_VALUE]"], [/[A-Za-z0-9+/=_-]{48,}/g, "[REDACTED_TOKEN]"]];
export function redactString(s) { return patterns.reduce((a, [r, m]) => a.replace(r, m), s); }
export function redactDeep(v) { if (typeof v === "string")
    return redactString(v); if (Array.isArray(v))
    return v.map(redactDeep); if (v && typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v))
        o[k] = redactDeep(val);
    return o;
} return v; }
