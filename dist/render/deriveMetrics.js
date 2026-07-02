import { fmtDuration, fmtTime } from "./viewModel.js";
const task = (s) => s.events.find((e) => e.type === "user_message")?.summary ??
    s.events.find((e) => e.type === "user_message")?.title ??
    (s.provider === "unknown" ? "Task unavailable" : "Task unavailable");
export const runnerLabel = (p) => ({
    claude: "Claude Code",
    codex: "Codex",
    pi: "Pi",
    git: "Git Replay",
    unknown: "Generic replay",
})[p] ??
    p ??
    "Generic replay";
export function deriveMetrics(session, replayStatus, capturedRunStatus) {
    const dur = session.startedAt && session.endedAt
        ? fmtDuration(new Date(session.endedAt).getTime() -
            new Date(session.startedAt).getTime())
        : "Duration unavailable";
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
            value: session.model ?? "Provider format unknown",
            subvalue: session.model
                ? "Captured model metadata"
                : `${runnerLabel(session.provider)} session`,
            icon: "model",
            empty: !session.model,
        },
        {
            id: "runner",
            label: "RUNNER",
            value: runnerLabel(session.provider),
            empty: !session.provider,
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
            empty: true,
        },
        {
            id: "cost",
            label: "COST (USD)",
            value: "Not captured",
            subvalue: "No cost telemetry",
            icon: "cost",
            empty: true,
        },
        {
            id: "status",
            label: "STATUS",
            value: replayStatus.label,
            subvalue: `Captured: ${capturedRunStatus.label} — ${capturedRunStatus.reason}`,
            icon: replayStatus.tone === "error"
                ? "x"
                : replayStatus.tone === "warning"
                    ? "warn"
                    : "check",
            tone: replayStatus.tone === "error"
                ? "error"
                : replayStatus.tone === "warning"
                    ? "warning"
                    : replayStatus.tone === "success"
                        ? "success"
                        : "info",
        },
        {
            id: "duration",
            label: "DURATION",
            value: dur,
            subvalue: session.startedAt
                ? `Started ${fmtTime(session.startedAt)}`
                : "No duration captured",
            icon: "clock",
            empty: dur === "Duration unavailable",
        },
        {
            id: "runid",
            label: "RUN ID",
            value: session.sessionId ?? "Not captured",
            subvalue: session.sessionId ? "Session identifier" : "No runner metadata",
            icon: "run",
            empty: !session.sessionId,
        },
    ];
}
