import { fmtDuration, fmtTime } from "./viewModel.js";
const task = (s) => s.events.find((e) => e.type === "user_message")?.summary ??
    s.events.find((e) => e.type === "user_message")?.title ??
    "Unknown task";
export const runnerLabel = (p) => ({ claude: "Claude Code", codex: "Codex", pi: "Pi", git: "Git Replay" })[p] ??
    p ??
    "Unknown";
export function deriveMetrics(session, hasFail, hasWarning) {
    const dur = session.startedAt && session.endedAt
        ? fmtDuration(new Date(session.endedAt).getTime() -
            new Date(session.startedAt).getTime())
        : "Not captured";
    return [
        {
            id: "task",
            label: "TASK",
            value: task(session),
            subvalue: session.provider,
            icon: "task",
        },
        {
            id: "model",
            label: "MODEL",
            value: session.model ?? "Unknown model",
            subvalue: session.model
                ? "Captured model metadata"
                : `${runnerLabel(session.provider)} session`,
            icon: "model",
        },
        {
            id: "runner",
            label: "RUNNER",
            value: runnerLabel(session.provider),
            subvalue: `${session.events.length} events`,
            icon: "runner",
        },
        {
            id: "tokens",
            label: "TOKENS",
            value: "Not captured",
            subvalue: "No token telemetry",
            icon: "tokens",
            telemetryAvailable: false,
        },
        {
            id: "cost",
            label: "COST (USD)",
            value: "Not captured",
            subvalue: "No cost telemetry",
            icon: "cost",
        },
        {
            id: "status",
            label: "STATUS",
            value: hasFail ? "FAILED" : hasWarning ? "WARNING" : "COMPLETE",
            subvalue: "Static replay",
            icon: hasFail ? "x" : hasWarning ? "warn" : "check",
            tone: hasFail ? "error" : hasWarning ? "warning" : "success",
        },
        {
            id: "duration",
            label: "DURATION",
            value: dur,
            subvalue: session.startedAt
                ? `Started ${fmtTime(session.startedAt)}`
                : "No duration captured",
            icon: "clock",
        },
        {
            id: "runid",
            label: "RUN ID",
            value: session.sessionId ?? "Not captured",
            subvalue: session.sessionId ? "Session identifier" : "No runner metadata",
            icon: "run",
        },
    ];
}
