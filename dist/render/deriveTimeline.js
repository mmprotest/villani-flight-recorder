import { fmtDuration, } from "./viewModel.js";
const rawIsError = (e) => Boolean(e.raw &&
    typeof e.raw === "object" &&
    "is_error" in e.raw &&
    e.raw.is_error === true);
export const eventStatus = (e) => e.type === "error" || (e.exitCode ?? 0) !== 0 || rawIsError(e)
    ? "failed"
    : "completed";
export const eventSeverity = (e) => e.type === "error" || (e.exitCode ?? 0) !== 0 || rawIsError(e)
    ? "failed"
    : e.type === "unknown" || (e.warnings?.length ?? 0) > 0
        ? "minor-warning"
        : "none";
function timelineCopy(e) {
    if (e.type === "test_run" && e.command && (e.exitCode ?? 0) !== 0) {
        return {
            title: `Test failed: ${e.command}`,
            subtitle: "Captured test command failed",
        };
    }
    if (e.command && (e.exitCode ?? 0) !== 0) {
        return {
            title: `Command failed: ${e.command}`,
            subtitle: "Captured command exited non-zero",
        };
    }
    if (e.type === "error" && e.command) {
        return {
            title: `Command failed: ${e.command}`,
            subtitle: e.summary || "Captured command failed",
        };
    }
    if (e.type === "tool_result" && rawIsError(e)) {
        return {
            title: "Tool result failed",
            subtitle: "Captured tool returned an error",
        };
    }
    if (e.command) {
        return { title: e.title, subtitle: "Captured command recorded" };
    }
    if (e.type.includes("file")) {
        return {
            title: e.title || "Captured file edit",
            subtitle: "Captured file edit",
        };
    }
    if (["git_commit", "git_status", "diff"].includes(e.type)) {
        return { title: e.title, subtitle: "Repository reconstruction" };
    }
    if (e.type === "unknown" || (e.warnings?.length ?? 0) > 0) {
        return {
            title: "Transcript parsed with warnings",
            subtitle: "Recorder recovered partial session data",
        };
    }
    if (e.type.includes("message")) {
        return { title: e.title, subtitle: "Captured agent run" };
    }
    return {
        title: e.title,
        subtitle: e.summary || e.path || "Recorder pipeline",
    };
}
const commandHasResult = (e) => e.exitCode !== undefined ||
    e.stdout !== undefined ||
    e.stderr !== undefined ||
    e.type === "error" ||
    rawIsError(e);
const commandIsStart = (e) => Boolean(e.command) && !commandHasResult(e);
const commandIsResult = (e) => Boolean(e.command) && commandHasResult(e);
function groupedCommandEvent(start, result) {
    const started = start.timestamp
        ? new Date(start.timestamp).getTime()
        : undefined;
    const ended = result.timestamp
        ? new Date(result.timestamp).getTime()
        : undefined;
    const durationMs = result.durationMs ??
        start.durationMs ??
        (started !== undefined && ended !== undefined
            ? Math.max(0, ended - started)
            : undefined);
    return {
        ...start,
        ...result,
        id: `${start.id}+${result.id}`,
        title: result.title || start.title,
        summary: result.summary || start.summary,
        command: start.command || result.command,
        durationMs,
        raw: {
            kind: "grouped_command_lifecycle",
            start,
            result,
            startTime: start.timestamp,
            endTime: result.timestamp,
        },
    };
}
function groupCommandLifecycle(events) {
    const grouped = [];
    const pending = [];
    for (const event of events) {
        if (commandIsResult(event)) {
            const match = pending.findIndex((p) => p.command === event.command);
            if (match >= 0) {
                const [start] = pending.splice(match, 1);
                grouped.push(groupedCommandEvent(start, event));
                continue;
            }
        }
        if (commandIsStart(event)) {
            pending.push(event);
            continue;
        }
        if (pending.length && event.type === "tool_result") {
            grouped.push(event);
            continue;
        }
        while (pending.length)
            grouped.push(pending.shift());
        grouped.push(event);
    }
    while (pending.length)
        grouped.push(pending.shift());
    return grouped;
}
export function deriveTimeline(events) {
    return groupCommandLifecycle(events).map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        title: timelineCopy(e).title,
        subtitle: timelineCopy(e).subtitle,
        durationLabel: fmtDuration(e.durationMs),
        status: eventStatus(e),
        severity: eventSeverity(e),
        icon: (e.command
            ? "terminal"
            : e.type.includes("file")
                ? "edit"
                : e.type.includes("message")
                    ? "review"
                    : "parse"),
        eventType: e.type,
        detail: {
            title: timelineCopy(e).title,
            summary: timelineCopy(e).subtitle,
            sourceLabel: e.command || e.type.includes("message") || e.type.includes("file")
                ? "Captured agent run"
                : ["git_commit", "git_status", "diff"].includes(e.type)
                    ? "Repository reconstruction"
                    : "Recorder pipeline",
            impactLabel: (e.exitCode ?? 0) !== 0 || e.type === "error" || rawIsError(e)
                ? "Captured run failed"
                : ["git_commit", "git_status", "diff"].includes(e.type)
                    ? "Git diff captured"
                    : "Replay event recorded",
            replayImpactLabel: (e.exitCode ?? 0) !== 0 || rawIsError(e)
                ? "Replay generated; captured command failed"
                : "Generated",
            capturedImpactLabel: (e.exitCode ?? 0) !== 0 || rawIsError(e)
                ? "Failed command/test"
                : e.command
                    ? "Command/tool recorded"
                    : ["git_commit", "git_status", "diff"].includes(e.type)
                        ? "N/A"
                        : "Captured run preserved",
            raw: e,
        },
        raw: e,
    }));
}
