import { deriveExecutionGraph } from "./deriveGraph.js";
import { deriveMetrics } from "./deriveMetrics.js";
import { deriveTimeline } from "./deriveTimeline.js";
import { changedFilesFromGit, diffFromGit } from "./deriveDetails.js";
export const fmtTime = (v) => {
    if (!v)
        return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime())
        ? v
        : d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
};
export const fmtDuration = (ms) => ms === undefined
    ? "—"
    : ms < 1000
        ? `${ms}ms`
        : `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)}s`;
const failed = (events) => events.some((e) => e.type === "error" || (e.exitCode ?? 0) !== 0);
export function deriveReplayViewModel(session, git) {
    const events = session.events.length
        ? session.events
        : [
            {
                id: "empty",
                provider: session.provider,
                type: "unknown",
                title: "No events captured",
                summary: "Replay data was empty",
            },
        ];
    const normalizedSession = { ...session, events };
    const warnings = [
        ...session.warnings,
        ...events.flatMap((e) => e.warnings ?? []),
    ];
    const hasFail = failed(events);
    const hasWarning = warnings.length > 2 ||
        events.filter((e) => e.type === "unknown").length >
            Math.max(0, events.length - events.filter((e) => e.type === "unknown").length);
    const timeline = deriveTimeline(events);
    return {
        brand: { title: "Villani Flight Recorder", mode: "REPLAY" },
        topBar: {
            playbackLabel: "Play",
            speedLabel: "1.0x",
            showProgress: true,
            primaryActionLabel: "Open in Console",
        },
        metrics: deriveMetrics(normalizedSession, hasFail, hasWarning),
        timeline,
        graph: deriveExecutionGraph({
            session: normalizedSession,
            git,
            htmlValid: true,
            outputWritten: true,
        }),
        details: timeline[0]?.detail ?? { title: "No event" },
        warnings,
        rawEvents: events,
        changedFiles: changedFilesFromGit(git),
        diff: diffFromGit(git),
        provider: session.provider,
        redactionReport: session
            .redactionReport,
    };
}
