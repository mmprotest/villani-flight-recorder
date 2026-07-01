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
const task = (s) => s.events.find((e) => e.type === "user_message")?.summary ??
    s.events.find((e) => e.type === "user_message")?.title ??
    "Unknown task";
const runner = (p) => ({ claude: "Claude Code", codex: "Codex", pi: "Pi", git: "Git Replay" })[p] ??
    p ??
    "Unknown";
const changedFiles = (git) => (git?.status ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const eventStatus = (e) => e.type === "error" || (e.exitCode ?? 0) !== 0
    ? "failed"
    : (e.warnings?.length ?? 0) > 0 || e.type === "unknown"
        ? "warning"
        : "completed";
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
    const warnings = [
        ...session.warnings,
        ...events.flatMap((e) => e.warnings ?? []),
    ];
    const unknown = events.filter((e) => e.type === "unknown").length;
    const hasFail = failed(events);
    const gitOk = Boolean(git?.head || git?.status || git?.diff || git?.diffStat);
    const diffOk = Boolean(git?.diff || git?.diffStat || events.some((e) => e.diff));
    const warn = warnings.length > 0 || unknown > 0;
    const dur = session.startedAt && session.endedAt
        ? fmtDuration(new Date(session.endedAt).getTime() -
            new Date(session.startedAt).getTime())
        : "Not captured";
    const metrics = [
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
            value: session.model ?? "Unknown",
            subvalue: session.model ? "Captured" : "Unknown",
            icon: "model",
        },
        {
            id: "runner",
            label: "RUNNER",
            value: runner(session.provider),
            subvalue: `${events.length} events`,
            icon: "runner",
        },
        {
            id: "tokens",
            label: "TOKENS",
            value: "Not captured",
            subvalue: "Input/output unavailable",
            icon: "tokens",
        },
        {
            id: "cost",
            label: "COST (USD)",
            value: "Not captured",
            subvalue: "Cost data unavailable",
            icon: "cost",
        },
        {
            id: "status",
            label: "STATUS",
            value: hasFail ? "FAILED" : warn ? "WARNING" : "COMPLETE",
            subvalue: "Static replay",
            icon: hasFail ? "x" : warn ? "warn" : "check",
            tone: hasFail ? "error" : warn ? "warning" : "success",
        },
        {
            id: "duration",
            label: "DURATION",
            value: dur,
            subvalue: session.startedAt
                ? `Started ${fmtTime(session.startedAt)}`
                : "Not captured",
            icon: "clock",
        },
        {
            id: "runid",
            label: "RUN ID",
            value: session.sessionId ?? "Unknown",
            subvalue: "Copy",
            icon: "run",
        },
    ];
    const timeline = events.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        title: e.title,
        subtitle: e.summary || e.command || e.path || e.type,
        durationLabel: fmtDuration(e.durationMs),
        status: eventStatus(e),
        icon: e.command
            ? "terminal"
            : e.type.includes("file")
                ? "edit"
                : e.type.includes("message")
                    ? "review"
                    : "parse",
        eventType: e.type,
        detail: { title: e.title, summary: e.summary, raw: e },
        raw: e,
    }));
    const base = [
        [
            "discover",
            "Discover",
            session.path || session.sessionPath ? "completed" : "warning",
            session.sessionPath ? "session found" : "path uncertain",
            "discover",
            40,
            56,
        ],
        [
            "parse",
            "Parse",
            events.length ? (warnings.length ? "warning" : "completed") : "failed",
            `${events.length} events`,
            "parse",
            235,
            56,
        ],
        [
            "normalize",
            "Normalize",
            timeline.length ? "completed" : "failed",
            "timeline events",
            "normalize",
            430,
            56,
        ],
        [
            "correlate",
            "Correlate",
            gitOk ? "completed" : "warning",
            gitOk ? "git metadata" : "git unavailable",
            "correlate",
            625,
            56,
        ],
        [
            "session-events",
            "Session Events",
            events.length ? (warn ? "warning" : "completed") : "failed",
            unknown ? `${unknown} unknown records` : `${events.length} known`,
            "terminal",
            205,
            190,
        ],
        [
            "git-state",
            "Git State",
            gitOk ? "completed" : "warning",
            git?.head ? git.head.slice(0, 12) : "not captured",
            "branch",
            410,
            190,
        ],
        [
            "diff-capture",
            "Diff Capture",
            diffOk ? "completed" : gitOk ? "warning" : "skipped",
            diffOk ? "diff available" : gitOk ? "not captured" : "not a git repo",
            "edit",
            615,
            190,
        ],
        [
            "validate",
            "Validate",
            hasFail ? "failed" : warn ? "warning" : "completed",
            hasFail ? "run failed" : warn ? "with warnings" : "static HTML valid",
            "shield",
            250,
            320,
        ],
        ["review", "Review", "skipped", "no review event", "review", 455, 320],
        ["finalize", "Finalize", "completed", "HTML written", "flag", 660, 320],
    ];
    const nodes = base.map(([id, title, status, subtitle, icon, x, y]) => ({
        id,
        title,
        status: status,
        subtitle,
        icon: icon,
        x,
        y,
        width: 150,
        height: 72,
        detail: { title, summary: subtitle },
    }));
    const links = [
        "discover:parse",
        "parse:normalize",
        "normalize:correlate",
        "correlate:session-events",
        "session-events:git-state",
        "git-state:diff-capture",
        "diff-capture:validate",
        "validate:review",
        "review:finalize",
    ].map((s, i) => {
        const [from, to] = s.split(":");
        const a = nodes.find((n) => n.id === from);
        const b = nodes.find((n) => n.id === to);
        const st = (a.status === "failed" || b.status === "failed"
            ? "failed"
            : a.status === "warning" || b.status === "warning"
                ? "warning"
                : a.status === "skipped" || b.status === "skipped"
                    ? "pending"
                    : "completed");
        return {
            id: `l${i}`,
            from,
            to,
            status: st,
            path: (i === 3 || i === 6
                ? "curve"
                : i === 1
                    ? "elbow"
                    : "straight"),
        };
    });
    return {
        brand: { title: "Villani Flight Recorder", mode: "REPLAY" },
        topBar: {
            playbackLabel: "Play",
            speedLabel: "1.0x",
            showProgress: true,
            primaryActionLabel: "Open in Console",
        },
        metrics,
        timeline,
        graph: {
            nodes,
            links,
            legend: [
                { label: "Completed", status: "completed" },
                { label: "Warning", status: "warning" },
                { label: "Failed", status: "failed" },
                { label: "Skipped", status: "skipped" },
            ],
        },
        details: timeline[0]?.detail ?? { title: "No event" },
        warnings,
        rawEvents: events,
        changedFiles: changedFiles(git),
        diff: git?.diff || git?.diffStat || "Not captured",
        provider: session.provider,
        redactionReport: session
            .redactionReport,
    };
}
