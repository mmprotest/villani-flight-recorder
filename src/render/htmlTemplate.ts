import { FlightEvent, ParsedSession } from "../providers/types.js";
import { GitInfo } from "../git/gitInfo.js";

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
const trunc = (s: unknown, n = 20_000) => {
  const t = String(s ?? "");
  return t.length > n
    ? `${t.slice(0, n)}\n\nOutput truncated to ${n.toLocaleString()} characters. Full raw event was larger.`
    : t;
};
const fmtTime = (v?: string) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
};
const fmtDuration = (ms?: number) => {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`;
};

function summary(events: FlightEvent[], git: GitInfo | null) {
  const filesRead = new Set(
    events.filter((e) => e.type === "file_read" && e.path).map((e) => e.path),
  );
  const filesEdited = new Set(
    events
      .filter(
        (e) =>
          ["file_edit", "file_write", "file_delete"].includes(e.type) && e.path,
      )
      .map((e) => e.path),
  );
  const commands = events.filter((e) => e.command);
  const tests = events.filter((e) => e.type === "test_run");
  const failed = events.filter(
    (e) => (e.exitCode ?? 0) !== 0 || e.type === "error",
  );
  const depFiles = [...filesEdited].filter((f) =>
    /(^|\/)(package.json|package-lock.json|pnpm-lock.yaml|yarn.lock|Cargo.toml|Cargo.lock|requirements.*\.txt|pyproject.toml|go.mod|go.sum)$/i.test(
      f ?? "",
    ),
  );
  const testFiles = [...filesEdited].filter((f) =>
    /(test|spec|__tests__)/i.test(f ?? ""),
  );
  const warnings = events.flatMap((e) => e.warnings ?? []);
  const unknown = events.filter((e) => e.type === "unknown");
  const risks = [
    depFiles.length && "Dependency file changed",
    depFiles.some((f) => /lock/i.test(f ?? "")) && "Lockfile changed",
    events.some((e) => (e.diff?.length ?? 0) > 20_000) && "Large rewrite",
    failed.length && "Tests failed",
    !tests.length && "No tests detected",
    unknown.length && "Unknown event types present",
    git?.dirty && "Repo dirty after run",
    sessionAny(events).redactionReport && "Secrets redacted",
  ].filter(Boolean);
  return {
    filesRead: filesRead.size,
    filesEdited: filesEdited.size,
    commands: commands.length,
    tests: tests.length,
    failed: failed.length,
    unknown: unknown.length,
    warnings: warnings.length,
    dirty: git?.dirty ? git.status : "",
    depFiles: depFiles.join(", "),
    testFiles: testFiles.join(", "),
    largeDiffs: events.filter((e) => (e.diff?.length ?? 0) > 20_000).length,
    finalHead: git?.head ?? "",
    risks,
  };
}
const sessionAny = (events: FlightEvent[]) =>
  events as unknown as { redactionReport?: unknown };

const icon = (name: string) => {
  const paths: Record<string, string> = {
    task: '<path d="M12 3l7 7-7 7-7-7 7-7z"/>',
    model:
      '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
    runner:
      '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    tokens: '<path d="M4 17c3-7 6 3 9-4s5 1 7-5"/>',
    cost: '<circle cx="12" cy="12" r="9"/><path d="M14.5 8.5c-1.5-1-5-.8-5 1.2 0 2.8 5 1.4 5 4.2 0 2-3.6 2.2-5 .9M12 6v12"/>',
    status:
      '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.5l2.3 2.3 4.7-5"/>',
    duration: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    run: '<path d="M7 7a5 5 0 0 1 10 0c0 5-10 5-10 10a5 5 0 0 0 10 0"/><path d="M9 7h.01M15 17h.01"/>',
    filter: '<path d="M4 5h16l-6 7v5l-4 2v-7L4 5z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l4 4"/>',
    code: '<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 5l-2 14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    flask:
      '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/>',
    shield:
      '<path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/>',
    flag: '<path d="M5 21V4h12l-2 4 2 4H5"/>',
    expand: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    branch:
      '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 6h8M6 8v4a6 6 0 0 0 6 6M18 8v4a6 6 0 0 1-6 6"/>',
    trophy:
      '<path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M8 6H4a4 4 0 0 0 4 4M16 6h4a4 4 0 0 1-4 4M12 12v4M8 20h8M10 16h4"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.status}</svg>`;
};

function metric(
  label: string,
  value: string,
  sub = "",
  iconName = "status",
  cls = "",
) {
  return `<article class="metric-card ${cls}"><div class="metric-top"><span>${esc(label)}</span>${icon(iconName)}</div><div class="metric-value">${esc(value)}</div>${sub ? `<div class="metric-sub">${esc(sub)}</div>` : ""}</article>`;
}
function statusOf(e: FlightEvent, i: number, total: number) {
  if (e.type === "error" || (e.exitCode ?? 0) !== 0) return "failed";
  if (i === Math.max(0, total - 2)) return "running";
  if (i === total - 1) return "pending";
  return "completed";
}
function taskTitle(session: ParsedSession) {
  return (
    session.events.find((e) => e.type === "user_message")?.summary ??
    session.events.find((e) => e.type === "user_message")?.title ??
    "Unknown task"
  );
}
function statusText(events: FlightEvent[]) {
  return events.some((e) => e.type === "error" || (e.exitCode ?? 0) !== 0)
    ? "FAILED"
    : "COMPLETE";
}
function duration(session: ParsedSession) {
  const start = session.startedAt ? new Date(session.startedAt).getTime() : NaN;
  const end = session.endedAt ? new Date(session.endedAt).getTime() : NaN;
  return Number.isFinite(start) && Number.isFinite(end)
    ? fmtDuration(end - start)
    : "N/A";
}

function topBar(session: ParsedSession, progress: number) {
  return `<header class="topbar"><div class="brand"><div class="brand-mark">V</div><h1>Villani Flight Recorder</h1><span class="live-chip"><i></i>REPLAY</span></div><div class="top-actions"><div class="progress-pill">${icon("runner")}<span>Run Progress</span><b>${progress}%</b><em><i style="width:${progress}%"></i></em></div><button class="action">Open in Console</button><button class="icon-btn">${icon("expand")}</button></div></header>`;
}
function metrics(session: ParsedSession, s: ReturnType<typeof summary>) {
  const totalTokens = "N/A";
  return `<section class="metrics">${metric("TASK", taskTitle(session), session.provider || "coding-agent", "task")} ${metric("MODEL", session.model ?? "Unknown", "captured from session", "model")} ${metric("RUNNER", session.provider ? `${session.provider}` : "Unknown", `events ${session.events.length}`, "runner")} ${metric("TOKENS", totalTokens, "Not captured", "tokens")} ${metric("COST (USD)", "N/A", "Not captured", "cost")} ${metric("STATUS", statusText(session.events), s.failed ? `${s.failed} failed event(s)` : "Replay ready", "status", s.failed ? "danger" : "ok")} ${metric("DURATION", duration(session), session.startedAt ? `Started ${fmtTime(session.startedAt)}` : "Not captured", "duration")} ${metric("RUN ID", session.sessionId ?? "Unknown", session.startedAt ?? "Not captured", "run")}</section>`;
}
function timeline(events: FlightEvent[]) {
  return `<section class="panel timeline-panel"><div class="panel-head"><div><h2>Live Event Timeline</h2><p>Real-time orchestration events</p></div><div class="panel-actions"><button data-filter="All">View All</button><button class="icon-btn" data-filter="Errors">${icon("filter")}</button></div></div><div class="timeline" id="timelineList">${events
    .map((ev, i) => {
      const st = statusOf(ev, i, events.length);
      return `<button class="timeline-row ${st}" data-event-index="${i}" data-kind="${esc(ev.type)}"><time>${esc(fmtTime(ev.timestamp))}</time><span class="rail-dot">${st === "completed" ? icon("check") : ""}</span><article><span class="row-icon">${icon(ev.type === "test_run" ? "flask" : ev.type.includes("file") ? "code" : ev.type === "error" ? "shield" : "search")}</span><div><strong>${esc(ev.title)}</strong><p>${esc(ev.summary || ev.command || ev.path || ev.type)}</p></div><em>${esc(fmtDuration(ev.durationMs))}</em></article></button>`;
    })
    .join("")}</div></section>`;
}
function executionGraph(events: FlightEvent[]) {
  const nodes = [
    "Discover",
    "Parse",
    "Normalize",
    "Correlate",
    "Session Events",
    "Git State",
    "Diff Capture",
    "Validate",
    "Review",
    "Finalize",
  ];
  return `<section class="panel graph-panel"><div class="panel-head"><div><h2>Execution Graph</h2><p>Live view of orchestration flow</p></div><div class="graph-controls"><button>Auto-Fit</button><button class="icon-btn">${icon("minus")}</button><span>100%</span><button class="icon-btn">${icon("plus")}</button><button class="icon-btn">${icon("expand")}</button></div></div><div class="graph-canvas">${nodes.map((n, i) => `<button class="graph-node n${i} ${i < 7 ? "done" : i === 7 ? "running" : "pending"}" data-graph-index="${Math.min(i, Math.max(0, events.length - 1))}"><span>${icon(i === 9 ? "flag" : i === 8 ? "shield" : i === 7 ? "flask" : i === 5 ? "branch" : i === 4 ? "code" : "search")}</span><b>${n}</b><small>${i < 7 ? "completed" : i === 7 ? "running" : "pending"}</small></button>`).join("")}<svg class="connectors" viewBox="0 0 1000 430" preserveAspectRatio="none"><path d="M135 78 H285 M420 78 H560 M700 78 H840 M860 118 V170 H340 V205 M340 265 V320 H470 M595 320 H720 M805 320 H935"/><path class="dash" d="M445 205 H590 M720 320 H805"/></svg></div><div class="graph-footer"><div class="legend"><span><i class="done-dot"></i>Completed</span><span><i></i>In Progress</span><span><i class="run-dot"></i>Running</span><span><i class="path-dot"></i>Active Path</span><span><i class="pending-dot"></i>Pending</span></div><div class="stream"><i></i>Live Updates <b>Streaming</b></div></div></section>`;
}
function detailTabs(
  session: ParsedSession,
  git: GitInfo | null,
  warnings: string[],
  report: unknown,
) {
  return `<section class="panel detail-panel"><div class="tabs" role="tablist">${["Event Detail", "Changed Files", "Diff", "Raw JSON", "Warnings", "Redaction"].map((t, i) => `<button class="tab ${i === 0 ? "active" : ""}" data-tab="${t}">${t}</button>`).join("")}</div><div id="detailContent" class="detail-content"></div><template id="changedFiles">${esc(git?.status || "Not captured")}</template><template id="gitDiff">${esc(trunc(git?.diff || git?.diffStat || "Not captured"))}</template><template id="rawSession">${esc(JSON.stringify(session, null, 2))}</template><template id="warningsData">${esc(warnings.join("\n") || "None")}</template><template id="redactionData">${esc(JSON.stringify(report ?? {}, null, 2))}</template></section>`;
}

export function htmlTemplate(session: ParsedSession, git: GitInfo | null) {
  const warnings = [
    ...session.warnings,
    ...session.events.flatMap((e) => e.warnings ?? []),
  ];
  const events = session.events.length
    ? session.events
    : [
        {
          id: "empty",
          provider: session.provider,
          type: "unknown",
          title: "No events captured",
          summary: "Replay data was empty",
        } as FlightEvent,
      ];
  const s = summary(events, git);
  const report = (session as ParsedSession & { redactionReport?: unknown })
    .redactionReport;
  const progress = statusText(events) === "FAILED" ? 82 : 100;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Villani Flight Recorder</title><style>${css()}</style></head><body><div class="app-shell">${topBar(session, progress)}${metrics({ ...session, events }, s)}<main class="ops-grid">${timeline(events)}${executionGraph(events)}</main>${detailTabs({ ...session, events }, git, warnings, report)}</div><script>const events=${safeJson(events)};${js()}</script></body></html>`;
}

function css() {
  return `:root{--bg:#02070d;--bg2:#07111b;--panel:rgba(10,20,30,.76);--panel2:rgba(15,29,42,.72);--border:rgba(128,171,210,.16);--border-strong:rgba(172,207,236,.32);--text:#edf5ff;--muted:#8d9bab;--muted2:#657382;--success:#9be28e;--warn:#f5c76b;--error:#ff7f89;--info:#76b7ff;--glow:rgba(58,154,255,.22);--green-glow:rgba(155,226,142,.25);--r-lg:18px;--r-md:12px;--r-sm:8px;--shadow:0 18px 60px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.04);--space:16px;--fs-xs:11px;--fs-sm:13px;--fs:14px;--fs-lg:18px;--fs-xl:26px;--lh:1.45}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% 0,rgba(41,139,230,.18),transparent 34%),radial-gradient(circle at 15% 20%,rgba(45,110,180,.11),transparent 28%),linear-gradient(180deg,#03070c,#050a12 55%,#02050a);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;line-height:var(--lh);min-height:100vh}body:before{content:"";position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(circle at 50% 20%,#000,transparent 70%)}svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.app-shell{max-width:1880px;margin:0 auto;padding:18px 20px 26px}.topbar,.brand,.top-actions,.metrics,.metric-top,.panel-head,.panel-actions,.graph-controls,.graph-footer,.legend,.stream,.tabs{display:flex;align-items:center}.topbar{justify-content:space-between;margin-bottom:16px}.brand{gap:16px}.brand-mark{font-weight:900;font-size:28px;letter-spacing:-.12em;text-shadow:0 0 18px var(--glow)}h1{font-size:28px;margin:0;font-weight:700;letter-spacing:-.04em}.live-chip,.progress-pill,.action,.icon-btn,.panel-actions button,.graph-controls button,.graph-controls span{border:1px solid var(--border);background:rgba(9,18,28,.72);border-radius:10px;color:var(--text);box-shadow:var(--shadow)}.live-chip{font-size:12px;padding:7px 10px;color:#bfeeb8}.live-chip i,.stream i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 16px var(--green-glow);margin-right:7px}.top-actions{gap:14px}.progress-pill{position:relative;gap:9px;padding:10px 16px;min-width:238px;font-size:13px}.progress-pill b{margin-left:auto}.progress-pill em{position:absolute;left:54px;right:66px;bottom:9px;height:2px;background:#24394b}.progress-pill em i{display:block;height:100%;background:#9ee7e1}.action,.icon-btn,.panel-actions button,.graph-controls button{height:44px;padding:0 18px;font:inherit;cursor:pointer}.icon-btn{width:44px;padding:0;display:grid;place-items:center}.metrics{display:grid;grid-template-columns:1.35fr .95fr .95fr 1.45fr .95fr .8fr .85fr 1.15fr;gap:8px;margin-bottom:14px}.metric-card,.panel{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--border);border-radius:var(--r-md);box-shadow:var(--shadow);backdrop-filter:blur(18px)}.metric-card{min-height:132px;padding:20px 22px;transition:.2s}.metric-card:hover,.timeline-row:hover article,.graph-node:hover{transform:translateY(-1px);border-color:var(--border-strong)}.metric-top{justify-content:space-between;color:var(--muted);font-size:var(--fs-xs);letter-spacing:.08em;text-transform:uppercase}.metric-value{font-size:18px;margin-top:18px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.metric-sub{color:var(--muted);font-size:12px;margin-top:8px}.metric-card.ok .metric-value{color:var(--success)}.metric-card.danger .metric-value{color:var(--error)}.ops-grid{display:grid;grid-template-columns:minmax(420px,.95fr) minmax(620px,1.45fr);gap:14px}.panel{border-radius:var(--r-lg);padding:24px;min-height:790px}.panel-head{justify-content:space-between;margin-bottom:20px}.panel h2{font-size:20px;margin:0 0 3px}.panel p{margin:0;color:var(--muted)}.panel-actions,.graph-controls{gap:10px}.panel-actions button,.graph-controls button,.graph-controls span{height:46px;padding:0 18px;color:#cbd6e2}.timeline{position:relative}.timeline:before{content:"";position:absolute;left:128px;top:12px;bottom:18px;width:1px;background:linear-gradient(var(--border-strong),rgba(255,255,255,.08))}.timeline-row{display:grid;grid-template-columns:104px 48px 1fr;align-items:center;width:100%;border:0;background:transparent;color:inherit;text-align:left;margin:0 0 8px;padding:0;cursor:pointer}.timeline-row time{color:#9ba8b7;font-size:14px}.rail-dot{z-index:1;width:24px;height:24px;border-radius:50%;border:2px solid #95a3b2;background:#08111a;display:grid;place-items:center}.timeline-row.completed .rail-dot{background:var(--success);border-color:var(--success);color:#07110c}.timeline-row.running .rail-dot{box-shadow:0 0 0 6px rgba(255,255,255,.08),0 0 18px var(--glow)}.timeline-row.failed .rail-dot{border-color:var(--error)}.timeline-row article{height:66px;display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:14px;border:1px solid rgba(134,171,204,.12);border-radius:10px;background:rgba(11,22,32,.72);padding:10px 14px;transition:.2s}.timeline-row.running article{border-color:var(--border-strong);box-shadow:0 0 25px rgba(108,184,255,.08)}.row-icon{width:40px;height:40px;border-radius:8px;background:rgba(255,255,255,.05);display:grid;place-items:center;color:#cbd6e2}.timeline-row strong{font-size:14px}.timeline-row p{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.timeline-row em{font-style:normal;color:var(--success);font-size:13px}.graph-panel{position:relative;overflow:hidden}.graph-canvas{position:relative;height:590px}.connectors{position:absolute;inset:70px 35px 70px 60px;z-index:0}.connectors path{fill:none;stroke:rgba(210,221,232,.75);stroke-width:2}.connectors .dash{stroke:rgba(210,221,232,.32);stroke-dasharray:8 7}.graph-node{position:absolute;z-index:1;width:170px;height:118px;border-radius:10px;border:1px solid var(--border-strong);background:linear-gradient(180deg,rgba(20,34,46,.92),rgba(9,17,25,.9));color:var(--text);display:grid;grid-template-columns:34px 1fr;grid-template-rows:1fr 24px;gap:0 12px;align-items:center;text-align:left;padding:20px;transition:.2s}.graph-node span{grid-row:1/3;color:#d5dde7}.graph-node b{font-size:15px}.graph-node small{text-transform:uppercase;color:var(--muted);font-size:11px;letter-spacing:.05em}.graph-node.done:after{content:"✓";position:absolute;right:10px;top:9px;background:var(--success);color:#08110d;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-weight:800}.graph-node.running{box-shadow:0 0 0 1px rgba(255,255,255,.08),0 0 28px rgba(118,183,255,.2)}.graph-node.running:after{content:"";position:absolute;right:-10px;top:-10px;width:28px;height:28px;border-radius:50%;border:3px solid rgba(230,239,249,.8);border-top-color:transparent;animation:spin 1.4s linear infinite}.graph-node.pending{border-style:dashed;opacity:.66}.n0{left:0;top:35px}.n1{left:205px;top:35px}.n2{left:430px;top:35px}.n3{right:35px;top:35px}.n4{left:175px;top:235px;width:210px}.n5{left:465px;top:245px;opacity:.7}.n6{left:160px;top:405px}.n7{left:375px;top:405px}.n8{left:585px;top:405px}.n9{right:30px;top:405px}.graph-footer{justify-content:space-between;gap:18px}.legend,.stream{min-height:62px;border:1px solid var(--border);border-radius:12px;background:rgba(10,20,29,.72);padding:0 22px;gap:28px;color:#b7c1cd;font-size:13px}.legend{flex:1}.legend i{display:inline-block;width:18px;height:18px;border-radius:50%;border:2px solid #9aa8b6;margin-right:8px;vertical-align:middle}.legend .done-dot{background:var(--success);border-color:var(--success)}.legend .run-dot,.legend .pending-dot{border-style:dashed}.legend .path-dot{border-radius:4px}.stream b{font-weight:500;margin-left:18px}.detail-panel{min-height:260px;margin-top:14px}.tabs{gap:8px;border-bottom:1px solid var(--border);padding-bottom:14px}.tab{background:transparent;border:1px solid transparent;color:var(--muted);border-radius:9px;padding:9px 12px;cursor:pointer}.tab.active{color:var(--text);background:rgba(118,183,255,.12);border-color:var(--border)}.detail-content{padding-top:16px;color:#cbd6e2}.detail-content pre{white-space:pre-wrap;word-break:break-word;background:#050a11;border:1px solid var(--border);border-radius:12px;padding:16px;max-height:440px;overflow:auto}.kv{display:grid;grid-template-columns:160px 1fr;gap:8px;font-size:13px}.kv b{color:var(--muted);font-weight:500}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1280px){.metrics{grid-template-columns:repeat(4,1fr)}.ops-grid{grid-template-columns:1fr}.panel{min-height:auto}}`;
}
function js() {
  return `let selected=0;let activeTab='Event Detail';function escHtml(s){return String(s??'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}function limit(v){const s=String(v??'');return s.length>20000?s.slice(0,20000)+'\\n\\nOutput truncated to 20,000 characters. Full raw event was larger.':s}function eventHtml(ev){return '<div class="kv"><b>Title</b><span>'+escHtml(ev.title)+'</span><b>Type</b><span>'+escHtml(ev.type)+'</span><b>Timestamp</b><span>'+escHtml(ev.timestamp||'Not captured')+'</span><b>Path</b><span>'+escHtml(ev.path||'N/A')+'</span><b>Command</b><span>'+escHtml(ev.command||'N/A')+'</span><b>Exit Code</b><span>'+escHtml(ev.exitCode??'N/A')+'</span></div><pre>'+escHtml(ev.summary||ev.stdout||ev.stderr||JSON.stringify(ev.raw,null,2)||'No detail captured')+'</pre>'}function template(id){return document.getElementById(id).innerHTML}function renderDetail(){const ev=events[selected]||events[0]||{};let html='';if(activeTab==='Event Detail')html=eventHtml(ev);if(activeTab==='Changed Files')html='<pre>'+template('changedFiles')+'</pre>';if(activeTab==='Diff')html='<pre>'+template('gitDiff')+'</pre>';if(activeTab==='Raw JSON')html='<pre>'+escHtml(limit(JSON.stringify(ev.raw||ev,null,2)))+'</pre>';if(activeTab==='Warnings')html='<pre>'+template('warningsData')+'</pre>';if(activeTab==='Redaction')html='<pre>'+template('redactionData')+'</pre>';document.getElementById('detailContent').innerHTML=html}document.querySelectorAll('[data-event-index]').forEach(function(btn){btn.addEventListener('click',function(){selected=Number(btn.dataset.eventIndex);activeTab='Event Detail';document.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab===activeTab)});renderDetail()})});document.querySelectorAll('[data-graph-index]').forEach(function(btn){btn.addEventListener('click',function(){selected=Number(btn.dataset.graphIndex);renderDetail()})});document.querySelectorAll('.tab').forEach(function(btn){btn.addEventListener('click',function(){activeTab=btn.dataset.tab;document.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t===btn)});renderDetail()})});document.querySelectorAll('[data-filter]').forEach(function(btn){btn.addEventListener('click',function(){const filter=btn.dataset.filter;document.querySelectorAll('[data-event-index]').forEach(function(row){row.style.display=filter==='All'||(filter==='Errors'&&(row.classList.contains('failed')||row.dataset.kind==='error'))?'grid':'none'})})});renderDetail();`;
}
