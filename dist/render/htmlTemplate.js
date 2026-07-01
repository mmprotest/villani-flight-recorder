export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const safeJsonForScript = (value) => JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
export const truncateText = (value, maxChars = 20_000) => {
    const text = String(value ?? "");
    return text.length > maxChars
        ? `${text.slice(0, maxChars)}\n\nOutput truncated to ${maxChars.toLocaleString()} characters. Full content was larger.`
        : text;
};
const fmtTime = (value) => {
    if (!value)
        return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
};
const fmtDuration = (ms) => {
    if (ms === undefined)
        return "—";
    if (ms < 1000)
        return `${ms}ms`;
    return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`;
};
const hasFailure = (events) => events.some((e) => e.type === "error" || (e.exitCode ?? 0) !== 0);
const statusText = (events) => hasFailure(events) ? "FAILED" : "REPLAY";
const taskTitle = (session) => session.events.find((e) => e.type === "user_message")?.summary ??
    session.events.find((e) => e.type === "user_message")?.title ??
    "Unknown task";
const sessionDuration = (session) => {
    const start = session.startedAt ? new Date(session.startedAt).getTime() : NaN;
    const end = session.endedAt ? new Date(session.endedAt).getTime() : NaN;
    return Number.isFinite(start) && Number.isFinite(end)
        ? fmtDuration(end - start)
        : "N/A";
};
const changedFiles = (git) => (git?.status ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
function deriveReplayViewModel(session, git) {
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
    const unknown = events.some((e) => e.type === "unknown");
    const failed = hasFailure(events);
    const gitOk = Boolean(git?.head || git?.status || git?.diff || git?.diffStat);
    const diffOk = Boolean(git?.diff || git?.diffStat || events.some((e) => e.diff));
    const warn = warnings.length > 0 || unknown;
    const graph = [
        {
            id: "discover",
            title: "Discover",
            status: session.path || session.sessionPath ? "completed" : "warning",
            subtitle: session.sessionPath ? "session found" : "path unavailable",
            icon: "discover",
        },
        {
            id: "parse",
            title: "Parse",
            status: events.length
                ? warnings.length
                    ? "warning"
                    : "completed"
                : "failed",
            subtitle: `${events.length} events`,
            icon: "parse",
        },
        {
            id: "normalize",
            title: "Normalize",
            status: events.length ? "completed" : "failed",
            subtitle: "normalized events",
            icon: "normalize",
        },
        {
            id: "correlate",
            title: "Correlate",
            status: gitOk ? "completed" : "warning",
            subtitle: gitOk ? "git metadata" : "git unavailable",
            icon: "correlate",
        },
        {
            id: "session-events",
            title: "Session Events",
            status: warn ? "warning" : "completed",
            subtitle: unknown ? "unknown records" : `${events.length} known`,
            icon: "terminal",
        },
        {
            id: "git-state",
            title: "Git State",
            status: gitOk ? "completed" : "warning",
            subtitle: git?.head ? git.head.slice(0, 12) : "not captured",
            icon: "branch",
        },
        {
            id: "diff-capture",
            title: "Diff Capture",
            status: diffOk ? "completed" : "warning",
            subtitle: diffOk ? "diff available" : "not captured",
            icon: "edit",
        },
        {
            id: "validate",
            title: "Validate",
            status: failed ? "failed" : warn ? "warning" : "completed",
            subtitle: failed
                ? "run failed"
                : warn
                    ? "with warnings"
                    : "static HTML valid",
            icon: "shield",
        },
        {
            id: "review",
            title: "Review",
            status: "completed",
            subtitle: "generated replay",
            icon: "review",
        },
        {
            id: "finalize",
            title: "Finalize",
            status: "completed",
            subtitle: "HTML written",
            icon: "flag",
        },
    ];
    return {
        session,
        git,
        events,
        warnings,
        graph,
        changedFilesCount: changedFiles(git).length,
        redactionReport: session
            .redactionReport,
    };
}
function icon(name) {
    const p = {
        play: '<path d="M8 5v14l11-7z"/>',
        external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M11 5H5v14h14v-6"/>',
        copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><rect x="4" y="4" width="11" height="11" rx="2"/>',
        task: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/>',
        model: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
        runner: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3"/>',
        tokens: '<path d="M4 17c3-7 6 3 9-4s5 1 7-5"/>',
        cost: '<circle cx="12" cy="12" r="9"/><path d="M12 6v12M15 9c-2-1-6-.8-6 1.3 0 2.7 6 1.3 6 4.1 0 2-4 2.3-6 1"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        run: '<path d="M7 7a5 5 0 0 1 10 0c0 5-10 5-10 10a5 5 0 0 0 10 0"/>',
        filter: '<path d="M4 5h16l-6 7v5l-4 2v-7z"/>',
        fullscreen: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/>',
        discover: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l4 4"/>',
        parse: '<path d="M7 3h7l4 4v14H7z"/><path d="M9 13h6M9 17h4"/>',
        normalize: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
        correlate: '<path d="M8 12h8"/><circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/>',
        terminal: '<path d="M4 7l5 5-5 5M11 17h9"/>',
        branch: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 6h8M6 8v4a6 6 0 0 0 6 6M18 8v4a6 6 0 0 1-6 6"/>',
        edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
        warn: '<path d="M12 3l10 18H2z"/><path d="M12 9v5M12 18h.01"/>',
        check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/>',
        x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
        shield: '<path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/>',
        review: '<path d="M5 5h14v12H7l-2 2z"/><path d="M8 9h8M8 13h5"/>',
        flag: '<path d="M5 21V4h12l-2 4 2 4H5"/>',
        dot: '<circle cx="12" cy="12" r="4"/>',
        minus: '<path d="M5 12h14"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${p[name] ?? p.dot}</svg>`;
}
function topBar() {
    return `<header class="topbar"><div class="brand"><div class="brand-mark"><span>V</span></div><h1>Villani Flight Recorder</h1><span class="replay-chip">REPLAY</span></div><div class="top-actions"><button class="glass-btn">${icon("play")}<span>Play</span><b>⌄</b></button><button class="glass-btn speed">1.0x</button><button class="glass-btn">${icon("external")}<span>Open in Console</span></button></div></header>`;
}
function metric(label, value, sub, iconName, extra = "") {
    return `<article class="metric-card ${extra}"><div class="metric-label">${icon(iconName)}<span>${escapeHtml(label)}</span></div><div class="metric-value">${escapeHtml(value)}</div><div class="metric-sub">${escapeHtml(sub)}</div>${label === "TOKENS" ? '<svg class="spark" viewBox="0 0 92 24"><path d="M2 18 C14 6 22 20 34 12 S54 8 66 14 78 7 90 5"/></svg>' : ""}</article>`;
}
function metricCards(vm) {
    const s = vm.session;
    return `<section class="metric-grid">${metric("TASK", taskTitle(s), s.provider || "coding-agent", "task")}${metric("MODEL", s.model ?? "Unknown", s.model ? "captured" : "Not captured", "model")}${metric("RUNNER", s.provider ?? "Unknown", `${vm.events.length} events`, "runner")}${metric("TOKENS", "N/A", "INPUT N/A · OUTPUT N/A · TOTAL N/A", "tokens")}${metric("COST (USD)", "N/A", "Not captured", "cost")}${metric("STATUS", statusText(vm.events), hasFailure(vm.events) ? "captured failure" : "static replay", "check", hasFailure(vm.events) ? "danger" : "ok")}${metric("DURATION", sessionDuration(s), s.startedAt ? `Started ${fmtTime(s.startedAt)}` : "Not captured", "clock")}${metric("RUN ID", s.sessionId ?? "Unknown", "copy", "run", "run-id")}</section>`;
}
function eventStatus(e) {
    if (e.type === "error" || (e.exitCode ?? 0) !== 0)
        return "failed";
    if ((e.warnings?.length ?? 0) > 0 || e.type === "unknown")
        return "warning";
    return "completed";
}
function timeline(vm) {
    return `<section class="panel timeline-panel"><div class="panel-head"><div><h2>Replay Event Timeline</h2><p>Chronological replay of orchestration events</p></div><div class="panel-actions"><button data-filter="all">${icon("filter")}Filters</button><button class="icon-only" data-filter="warnings">${icon("warn")}</button></div></div><div class="timeline-list">${vm.events
        .map((ev, i) => {
        const st = eventStatus(ev);
        return `<button class="timeline-row ${st} ${i === 0 ? "selected" : ""}" data-event-index="${i}" data-kind="${escapeHtml(ev.type)}"><time>${escapeHtml(fmtTime(ev.timestamp))}</time><span class="rail"><i>${st === "completed" ? icon("check") : st === "failed" ? icon("x") : st === "warning" ? icon("warn") : ""}</i></span><article><span class="row-icon">${icon(ev.command ? "terminal" : ev.type.includes("file") ? "edit" : ev.type === "user_message" || ev.type === "assistant_message" ? "review" : "parse")}</span><div><strong>${escapeHtml(ev.title)}</strong><p>${escapeHtml(ev.summary || ev.command || ev.path || ev.type)}</p></div><em>${escapeHtml(fmtDuration(ev.durationMs))}</em></article></button>`;
    })
        .join("")}</div></section>`;
}
function executionGraph(vm) {
    const statusClass = (a, b = a) => a === "failed" || b === "failed"
        ? "fail"
        : a === "warning" || b === "warning"
            ? "warn"
            : a === "pending" || b === "pending"
                ? "pending"
                : "done";
    return `<section class="panel graph-panel"><div class="panel-head"><div><h2>Execution Graph</h2><p>Replay view of orchestration flow</p></div><div class="graph-controls"><button>Fit</button><button class="icon-only">${icon("minus")}</button><span>100%</span><button class="icon-only">${icon("plus")}</button><button class="icon-only">${icon("fullscreen")}</button></div></div><div class="graph-canvas"><svg class="graph-links" viewBox="0 0 1040 455" preserveAspectRatio="none"><defs><marker id="arrow-done" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8"/></marker><marker id="arrow-warn" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8"/></marker><marker id="arrow-fail" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8"/></marker></defs><path class="${statusClass(vm.graph[0].status, vm.graph[1].status)}" d="M160 61 H246"/><path class="${statusClass(vm.graph[1].status, vm.graph[2].status)}" d="M406 61 H492"/><path class="${statusClass(vm.graph[2].status, vm.graph[3].status)}" d="M652 61 H738"/><path class="${statusClass(vm.graph[3].status, vm.graph[4].status)}" d="M818 102 C818 150 252 150 252 190"/><path class="${statusClass(vm.graph[4].status, vm.graph[5].status)}" d="M332 231 H445"/><path class="${statusClass(vm.graph[5].status, vm.graph[6].status)}" d="M605 231 H718"/><path class="${statusClass(vm.graph[6].status, vm.graph[7].status)} dashed" d="M798 272 C798 326 252 326 252 358"/><path class="${statusClass(vm.graph[7].status, vm.graph[8].status)}" d="M332 399 H492"/><path class="${statusClass(vm.graph[8].status, vm.graph[9].status)}" d="M652 399 H812"/></svg>${vm.graph.map((n, i) => `<button class="graph-node node-${i} ${n.status}" data-graph-index="${Math.min(i, vm.events.length - 1)}"><span class="node-icon">${icon(n.icon)}</span><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.subtitle)}</small><i class="node-badge">${icon(n.status === "failed" ? "x" : n.status === "warning" ? "warn" : "check")}</i></button>`).join("")}</div><div class="graph-legend"><span><i class="l-complete"></i>Completed</span><span><i class="l-running"></i>Running</span><span><i class="l-warning"></i>Warning</span><span><i class="l-pending"></i>Pending</span><span><i class="l-planned"></i>Planned</span></div></section>`;
}
function detailPanel(vm) {
    const tabs = [
        ["Event Detail", ""],
        ["Changed Files", String(vm.changedFilesCount)],
        ["Diff", ""],
        ["Raw JSON", ""],
        ["Warnings", vm.warnings.length ? String(vm.warnings.length) : ""],
        ["Redaction", ""],
    ];
    return `<section class="panel detail-panel"><div class="tabs">${tabs.map(([t, b], i) => `<button class="tab ${i === 0 ? "active" : ""}" data-tab="${t}">${t}${b ? `<span>${b}</span>` : ""}</button>`).join("")}</div><div id="detailContent" class="detail-content"></div><template id="changedFiles">${escapeHtml(changedFiles(vm.git).join("\n") || "Not captured")}</template><template id="gitDiff">${escapeHtml(truncateText(vm.git?.diff || vm.git?.diffStat || "Not captured"))}</template><template id="warningsData">${escapeHtml(vm.warnings.join("\n") || "None")}</template><template id="redactionData">${escapeHtml(JSON.stringify(vm.redactionReport ?? {}, null, 2))}</template></section>`;
}
export function htmlTemplate(session, git) {
    const vm = deriveReplayViewModel(session, git);
    const data = {
        events: vm.events,
        graph: vm.graph,
        provider: session.provider,
    };
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Villani Flight Recorder</title><style>${css()}</style></head><body><div class="app-shell">${topBar()}${metricCards(vm)}<main class="main-grid">${timeline(vm)}${executionGraph(vm)}</main>${detailPanel(vm)}</div><script>const replayData=${safeJsonForScript(data)};${js()}</script></body></html>`;
}
function css() {
    return `:root{--bg-0:#03070d;--bg-1:#06101a;--panel:rgba(8,19,31,.82);--panel-strong:rgba(10,24,39,.92);--panel-soft:rgba(12,28,46,.64);--border:rgba(124,170,220,.17);--border-strong:rgba(132,190,255,.32);--border-active:rgba(59,153,255,.85);--border-success:rgba(126,226,139,.62);--border-warning:rgba(255,204,77,.72);--border-muted:rgba(155,177,202,.26);--text:#eef6ff;--text-soft:#b8c5d6;--text-muted:#758397;--text-dim:#566171;--blue:#3b99ff;--blue-strong:#63b3ff;--green:#8ee38e;--amber:#ffd24d;--red:#ff6b6b;--glow-blue:0 0 28px rgba(59,153,255,.34);--glow-green:0 0 20px rgba(126,226,139,.20);--glow-amber:0 0 20px rgba(255,210,77,.20);--radius-lg:14px;--radius-md:10px;--radius-sm:7px}*{box-sizing:border-box}body{margin:0;min-height:100vh;color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;background:radial-gradient(circle at 18% 0%,rgba(60,140,255,.16),transparent 30%),radial-gradient(circle at 78% 16%,rgba(28,88,160,.12),transparent 34%),linear-gradient(180deg,#03070d 0%,#06101a 45%,#02050a 100%)}body:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 8%,rgba(61,156,255,.11),transparent 38%),linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.014) 1px,transparent 1px);background-size:auto,44px 44px,44px 44px}.app-shell{position:relative;max-width:1760px;margin:0 auto;padding:16px 18px 24px}svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.topbar,.brand,.top-actions,.metric-label,.panel-head,.panel-actions,.graph-controls,.tabs,.graph-legend{display:flex;align-items:center}.topbar{height:60px;justify-content:space-between;margin-bottom:10px}.brand{gap:12px}.brand-mark{width:34px;height:34px;border:1px solid var(--border-active);border-radius:10px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(57,151,255,.22),rgba(8,19,31,.8));box-shadow:var(--glow-blue)}.brand-mark span{font-weight:900;font-size:20px;color:#dff0ff}h1{margin:0;font-size:24px;letter-spacing:-.035em}.replay-chip{font-size:11px;font-weight:800;letter-spacing:.12em;color:var(--blue-strong);border:1px solid rgba(59,153,255,.5);background:rgba(13,45,76,.66);border-radius:999px;padding:6px 10px}.top-actions{gap:8px}.glass-btn,.icon-only,.panel-actions button,.graph-controls button,.graph-controls span{height:36px;border:1px solid var(--border);background:linear-gradient(180deg,rgba(18,35,54,.75),rgba(8,17,28,.82));color:var(--text-soft);border-radius:9px;padding:0 12px;font:inherit;font-size:12px;display:inline-flex;align-items:center;gap:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04);cursor:pointer}.glass-btn:hover,.icon-only:hover,.panel-actions button:hover,.graph-controls button:hover{border-color:var(--border-active);box-shadow:var(--glow-blue)}.speed{font-weight:750}.metric-grid{display:grid;grid-template-columns:1.35fr 1.05fr 1.1fr 1.75fr 1.1fr .9fr 1fr 1.25fr;gap:8px;margin-bottom:8px}.metric-card,.panel{background:linear-gradient(180deg,rgba(12,28,46,.84),rgba(5,14,24,.88)),var(--panel);border:1px solid var(--border);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 18px 60px rgba(0,0,0,.24);backdrop-filter:blur(16px)}.metric-card{position:relative;min-height:104px;border-radius:var(--radius-md);padding:14px;overflow:hidden}.metric-card:after{content:"";position:absolute;inset:auto 0 0;height:1px;background:linear-gradient(90deg,transparent,rgba(59,153,255,.34),transparent)}.metric-label{gap:7px;color:var(--text-muted);font-size:10px;font-weight:800;letter-spacing:.12em}.metric-label svg{width:15px;height:15px;color:var(--blue-strong)}.metric-value{margin-top:13px;font-size:15px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.metric-sub{margin-top:6px;color:var(--text-muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.metric-card.ok .metric-value{color:var(--green)}.metric-card.danger .metric-value{color:var(--red)}.spark{position:absolute;right:12px;bottom:14px;width:92px;height:24px}.spark path{stroke:var(--blue-strong);stroke-width:2;filter:drop-shadow(0 0 4px rgba(59,153,255,.55))}.main-grid{display:grid;grid-template-columns:minmax(360px,.9fr) minmax(720px,2.1fr);gap:8px}.panel{border-radius:var(--radius-lg);padding:16px;min-height:590px}.panel-head{justify-content:space-between;margin-bottom:12px;gap:16px}.panel h2{margin:0 0 2px;font-size:17px;letter-spacing:-.01em}.panel p{margin:0;color:var(--text-muted);font-size:12px}.panel-actions,.graph-controls{gap:6px}.icon-only{width:36px;padding:0;justify-content:center}.timeline-list{position:relative;max-height:520px;overflow:auto;padding-right:4px}.timeline-list:before{content:"";position:absolute;left:104px;top:8px;bottom:8px;width:1px;background:linear-gradient(var(--border-strong),rgba(124,170,220,.08))}.timeline-row{display:grid;grid-template-columns:82px 44px 1fr;align-items:center;width:100%;border:0;background:transparent;color:inherit;text-align:left;margin:0 0 6px;padding:0;cursor:pointer}.timeline-row time{color:var(--text-muted);font-size:11px}.rail{z-index:1;display:grid;place-items:center}.rail i{width:23px;height:23px;border-radius:50%;border:1px solid var(--border-muted);background:#07111d;display:grid;place-items:center;color:var(--text-dim)}.rail svg{width:14px;height:14px}.completed .rail i{color:#06130d;background:var(--green);border-color:var(--border-success);box-shadow:var(--glow-green)}.warning .rail i{color:var(--amber);border-color:var(--border-warning);box-shadow:var(--glow-amber)}.failed .rail i{color:var(--red);border-color:rgba(255,107,107,.7)}.timeline-row article{height:54px;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;padding:8px 10px;border:1px solid rgba(124,170,220,.12);border-radius:10px;background:linear-gradient(180deg,rgba(15,31,48,.72),rgba(8,18,30,.72));transition:.16s}.timeline-row:hover article,.timeline-row.selected article{border-color:var(--border-active);background:linear-gradient(180deg,rgba(20,45,70,.86),rgba(8,20,34,.86));box-shadow:0 0 24px rgba(59,153,255,.11)}.row-icon{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;color:var(--blue-strong);background:rgba(59,153,255,.08);border:1px solid rgba(59,153,255,.18)}.timeline-row strong{display:block;font-size:12px}.timeline-row p{margin:2px 0 0;color:var(--text-muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:360px}.timeline-row em{font-style:normal;color:var(--text-soft);font-size:11px}.graph-panel{position:relative;overflow:hidden}.graph-canvas{position:relative;height:500px;margin-top:2px}.graph-links{position:absolute;inset:12px 8px 0 8px;width:calc(100% - 16px);height:450px;z-index:0}.graph-links path{fill:none;stroke-width:2.2;marker-end:url(#arrow-done)}.graph-links marker path{fill:var(--green);stroke:0}.graph-links .done{stroke:rgba(126,226,139,.72)}.graph-links .warn{stroke:rgba(255,210,77,.72);marker-end:url(#arrow-warn)}.graph-links .fail{stroke:rgba(255,107,107,.72);marker-end:url(#arrow-fail)}.graph-links .pending{stroke:rgba(155,177,202,.28);stroke-dasharray:8 7}.graph-links .dashed{stroke-dasharray:8 7}.graph-node{position:absolute;z-index:1;width:160px;height:82px;border-radius:12px;border:1px solid var(--border);background:linear-gradient(180deg,rgba(16,35,55,.93),rgba(7,17,29,.94));color:var(--text);display:grid;grid-template-columns:30px 1fr;grid-template-rows:1fr 24px;gap:0 9px;text-align:left;padding:14px 12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 12px 30px rgba(0,0,0,.22);cursor:pointer}.graph-node:hover,.graph-node.selected{border-color:var(--border-active);box-shadow:var(--glow-blue),inset 0 1px 0 rgba(255,255,255,.05)}.node-icon{grid-row:1/3;color:var(--blue-strong);align-self:center}.graph-node b{font-size:13px}.graph-node small{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em}.node-badge{position:absolute;right:9px;top:8px}.node-badge svg{width:16px;height:16px}.graph-node.completed{border-color:var(--border-success);box-shadow:var(--glow-green),inset 0 1px 0 rgba(255,255,255,.05)}.graph-node.completed .node-badge,.graph-node.completed .node-icon{color:var(--green)}.graph-node.warning{border-color:var(--border-warning);box-shadow:var(--glow-amber)}.graph-node.warning .node-badge,.graph-node.warning .node-icon{color:var(--amber)}.graph-node.failed{border-color:rgba(255,107,107,.7)}.graph-node.failed .node-badge,.graph-node.failed .node-icon{color:var(--red)}.graph-node.pending{border-style:dashed;opacity:.68}.node-0{left:0;top:24px}.node-1{left:24%;top:24px}.node-2{left:48%;top:24px}.node-3{right:4%;top:24px}.node-4{left:17%;top:183px}.node-5{left:41%;top:183px}.node-6{left:65%;top:183px}.node-7{left:17%;top:351px}.node-8{left:48%;top:351px}.node-9{right:4%;top:351px}.graph-legend{position:absolute;left:16px;bottom:14px;gap:14px;border:1px solid var(--border);border-radius:999px;background:rgba(5,14,24,.72);padding:8px 12px;color:var(--text-muted);font-size:11px}.graph-legend i{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:5px;vertical-align:-2px;border:1px solid var(--border-muted)}.l-complete{background:var(--green)!important;border-color:var(--green)!important}.l-running{border-color:var(--blue)!important;box-shadow:var(--glow-blue)}.l-warning{background:var(--amber)!important;clip-path:polygon(50% 0,100% 100%,0 100%);border:0!important}.l-planned{border-style:dashed!important;border-radius:3px!important}.detail-panel{min-height:238px;margin-top:8px}.tabs{gap:6px;border-bottom:1px solid var(--border);padding-bottom:10px}.tab{background:transparent;color:var(--text-muted);border:0;border-bottom:2px solid transparent;padding:8px 10px;font:inherit;font-size:12px;cursor:pointer}.tab.active{color:var(--text);border-bottom-color:var(--blue);background:rgba(59,153,255,.07);border-radius:8px 8px 0 0}.tab span{margin-left:6px;color:var(--blue-strong)}.detail-content{padding-top:14px}.detail-hero{display:grid;grid-template-columns:62px 1fr auto;gap:14px;align-items:start}.detail-icon{width:54px;height:54px;border-radius:13px;border:1px solid var(--border-active);display:grid;place-items:center;color:var(--blue-strong);box-shadow:var(--glow-blue);background:rgba(59,153,255,.08)}.status-chip{display:inline-flex;align-items:center;gap:6px;margin:5px 0 8px;padding:4px 8px;border-radius:999px;border:1px solid var(--border);font-size:11px;color:var(--text-soft);text-transform:uppercase}.meta-grid{display:grid;grid-template-columns:110px minmax(180px,1fr);gap:7px 10px;min-width:380px;font-size:12px}.meta-grid b{color:var(--text-muted);font-weight:600}.detail-content p{margin:0;color:var(--text-soft);font-size:13px}.detail-content pre{white-space:pre-wrap;word-break:break-word;margin:0;background:#030912;border:1px solid var(--border);border-radius:12px;padding:14px;max-height:420px;overflow:auto;color:#d7e4f5}@media(max-width:1280px){.metric-grid{grid-template-columns:repeat(4,1fr)}.main-grid{grid-template-columns:minmax(340px,.9fr) minmax(580px,1.6fr)}}@media(max-width:1024px){.metric-grid{grid-template-columns:repeat(2,1fr)}.main-grid{grid-template-columns:1fr}.panel{min-height:auto}.graph-canvas{min-width:900px}.graph-panel{overflow:auto}}`;
}
function js() {
    return `let selected=0;let activeTab='Event Detail';const events=replayData.events||[];const graph=replayData.graph||[];function escHtml(s){return String(s??'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}function limit(v){const s=String(v??'');return s.length>20000?s.slice(0,20000)+'\\n\\nOutput truncated to 20,000 characters. Full content was larger.':s}function template(id){return document.getElementById(id).innerHTML}function eventHtml(ev){return '<div class="detail-hero"><div class="detail-icon">${icon("parse").replace(/`/g, "")}</div><div><h3>'+escHtml(ev.title||'Replay event')+'</h3><span class="status-chip">'+escHtml((ev.type||'event').replaceAll('_',' '))+'</span><p>'+escHtml(ev.summary||ev.command||ev.path||'No summary captured')+'</p></div><div class="meta-grid"><b>Event ID</b><span>'+escHtml(ev.id||'N/A')+'</span><b>Started</b><span>'+escHtml(ev.timestamp||'Not captured')+'</span><b>Provider/Runner</b><span>'+escHtml(ev.provider||replayData.provider||'Unknown')+'</span><b>Duration</b><span>'+escHtml(ev.durationMs==null?'N/A':ev.durationMs+'ms')+'</span><b>Retries</b><span>N/A</span><b>Path</b><span>'+escHtml(ev.path||'N/A')+'</span><b>Command</b><span>'+escHtml(ev.command||'N/A')+'</span><b>Exit code</b><span>'+escHtml(ev.exitCode??'N/A')+'</span></div></div>'+(ev.stdout||ev.stderr?'<p><button class="glass-btn">View Logs</button></p>':'')}function graphHtml(n){return '<div class="detail-hero"><div class="detail-icon">${icon("shield").replace(/`/g, "")}</div><div><h3>'+escHtml(n.title||'Graph phase')+'</h3><span class="status-chip">'+escHtml(n.status||'phase')+'</span><p>'+escHtml(n.subtitle||'Replay phase detail')+'</p></div><div class="meta-grid"><b>Event ID</b><span>'+escHtml(n.id||'N/A')+'</span><b>Started</b><span>Not captured</span><b>Provider/Runner</b><span>'+escHtml(replayData.provider||'Unknown')+'</span><b>Duration</b><span>Not captured</span><b>Retries</b><span>N/A</span></div></div>'}function renderDetail(kind){const ev=events[selected]||events[0]||{};let html='';if(activeTab==='Event Detail')html=kind==='graph'?graphHtml(graph[selected]||{}):eventHtml(ev);if(activeTab==='Changed Files')html='<pre>'+template('changedFiles')+'</pre>';if(activeTab==='Diff')html='<pre>'+template('gitDiff')+'</pre>';if(activeTab==='Raw JSON')html='<pre>'+escHtml(limit(JSON.stringify(ev.raw||ev,null,2)))+'</pre>';if(activeTab==='Warnings')html='<pre>'+template('warningsData')+'</pre>';if(activeTab==='Redaction')html='<pre>'+template('redactionData')+'</pre>';document.getElementById('detailContent').innerHTML=html}function setActiveTab(tab){activeTab=tab;document.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab===activeTab)})}document.querySelectorAll('[data-event-index]').forEach(function(btn){btn.addEventListener('click',function(){selected=Number(btn.dataset.eventIndex);setActiveTab('Event Detail');document.querySelectorAll('.timeline-row').forEach(function(r){r.classList.toggle('selected',r===btn)});renderDetail('event')})});document.querySelectorAll('[data-graph-index]').forEach(function(btn){btn.addEventListener('click',function(){selected=Number(btn.dataset.graphIndex);setActiveTab('Event Detail');document.querySelectorAll('.graph-node').forEach(function(r){r.classList.toggle('selected',r===btn)});renderDetail('graph')})});document.querySelectorAll('.tab').forEach(function(btn){btn.addEventListener('click',function(){setActiveTab(btn.dataset.tab);renderDetail('event')})});document.querySelectorAll('[data-filter]').forEach(function(btn){btn.addEventListener('click',function(){const f=btn.dataset.filter;document.querySelectorAll('[data-event-index]').forEach(function(row){const warning=row.classList.contains('warning');const failed=row.classList.contains('failed');row.style.display=f==='all'||(f==='warnings'&&(warning||failed))?'grid':'none'})})});document.querySelectorAll('.run-id').forEach(function(card){card.addEventListener('click',function(){navigator.clipboard&&navigator.clipboard.writeText(card.querySelector('.metric-value')?.textContent||'')})});renderDetail('event');`;
}
