export const themeCss = () => `
/* =========================================================
   Design tokens
   ========================================================= */
:root {
  --bg-0: #03070d;
  --bg-1: #06101a;
  --panel: rgba(8, 19, 31, 0.84);
  --panel-strong: rgba(12, 28, 46, 0.86);
  --border: rgba(124, 170, 220, 0.17);
  --border-active: rgba(59, 153, 255, 0.85);
  --border-success: rgba(126, 226, 139, 0.62);
  --border-warning: rgba(255, 204, 77, 0.72);
  --border-muted: rgba(155, 177, 202, 0.26);
  --text: #eef6ff;
  --text-soft: #b8c5d6;
  --text-muted: #758397;
  --text-dim: #5f6f84;
  --blue: #3b99ff;
  --green: #8ee38e;
  --amber: #ffd24d;
  --red: #ff6b6b;
  --glow-blue: 0 0 28px rgba(59, 153, 255, 0.34);
  --glow-green: 0 0 20px rgba(126, 226, 139, 0.20);
  --glow-amber: 0 0 20px rgba(255, 210, 77, 0.20);
}

/* =========================================================
   Base
   ========================================================= */
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100vh;
}

body {
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
  background: radial-gradient(circle at 18% 0%, rgba(60, 140, 255, 0.16), transparent 30%), linear-gradient(180deg, var(--bg-0), var(--bg-1) 45%, #02050a);
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.014) 1px, transparent 1px);
  background-size: 44px 44px;
}

svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* =========================================================
   Investigation report layout
   ========================================================= */
.app-shell {
  max-width: 1440px;
  margin: 0 auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.topbar, .brand, .transport, .panel-head, .panel-actions, .tabs, .graph-legend { display:flex; align-items:center; }
.topbar { position: sticky; top: 0; z-index: 10; justify-content: space-between; gap: 16px; padding: 10px 0; backdrop-filter: blur(14px); }
.brand { gap: 12px; min-width: 0; }
.brand-mark { width: 34px; height: 34px; border: 1px solid var(--border-active); border-radius: 10px; display: grid; place-items: center; }
h1 { margin: 0; font-size: clamp(20px, 3vw, 26px); }
.replay-chip { font-size: 11px; font-weight: 800; color: #8bc8ff; border: 1px solid rgba(59,153,255,.35); border-radius: 999px; padding: 6px 10px; }
.transport { color: var(--text-muted); border: 1px solid rgba(124,170,220,.14); border-radius: 999px; padding: 8px 12px; font-size: 12px; background: rgba(8,19,31,.56); }
.panel, .run-summary { background: linear-gradient(180deg, rgba(12,28,46,.74), rgba(5,14,24,.82)); border: 1px solid rgba(124,170,220,.14); border-radius: 18px; }
.panel { padding: 18px; }
.panel-head { justify-content: space-between; gap: 14px; margin-bottom: 14px; }
.panel h2 { margin: 0 0 4px; font-size: 19px; }
.panel p { margin: 0; color: var(--text-muted); font-size: 13px; line-height: 1.45; }
.run-summary { padding: 22px; display: grid; grid-template-columns: minmax(280px, 1.1fr) minmax(320px, 1fr); gap: 18px 24px; }
.outcome-card { border-left: 5px solid var(--blue); padding-left: 18px; }
.run-summary.success .outcome-card { border-left-color: var(--green); }
.run-summary.warning .outcome-card { border-left-color: var(--amber); }
.run-summary.error .outcome-card { border-left-color: var(--red); }
.outcome-kicker, .metadata-row dt { color: var(--text-muted); text-transform: uppercase; letter-spacing: .12em; font-size: 11px; font-weight: 800; }
.outcome-card h2 { margin: 8px 0; font-size: clamp(26px, 4vw, 42px); line-height: 1.05; letter-spacing: -0.035em; }
.outcome-card p { margin: 0; color: var(--text-soft); font-size: 14px; }
.summary-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.summary-facts article { border: 1px solid rgba(124,170,220,.10); border-radius: 14px; padding: 13px; background: rgba(8,19,31,.35); min-width:0; }
.summary-facts b { display:block; font-size: 18px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.summary-facts span { color: var(--text-muted); font-size: 12px; }
.metadata-row { grid-column: 1 / -1; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; margin: 0; }
.metadata-row div { min-width: 0; }
.metadata-row dd { margin: 4px 0 0; color: var(--text-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.summary-note { grid-column: 1 / -1; display:flex; gap:10px; align-items:center; color: var(--text-muted); font-size: 13px; }
.summary-note svg { width: 16px; }
.investigation-grid-main { display:grid; grid-template-columns: minmax(360px,.8fr) minmax(520px,1.2fr); gap:18px; align-items:start; }
.timeline-list { display:flex; flex-direction:column; gap:8px; }
.timeline-row { display:grid; grid-template-columns: 72px 26px minmax(0,1fr); gap: 8px; align-items:center; width:100%; border:0; background:transparent; color:inherit; text-align:left; padding:0; cursor:pointer; }
.timeline-row time { color: var(--text-muted); font-size: 11px; white-space: nowrap; overflow:hidden; text-overflow:ellipsis; }
.rail { display:grid; place-items:center; }
.rail i { width:24px; height:24px; border-radius:999px; border:1px solid var(--border-muted); display:grid; place-items:center; background:#07111d; }
.rail svg { width:14px; }
.completed .rail i { color:#06130d; background:var(--green); }
.warning .rail i, .severity-minor-warning .rail i { color:var(--amber); border-color:var(--border-warning); }
.failed .rail i { color:var(--red); border-color:rgba(255,107,107,.7); }
.timeline-row article { min-height:58px; display:grid; grid-template-columns:32px minmax(0,1fr) auto; gap:10px; align-items:center; padding:10px 12px; border:1px solid rgba(124,170,220,.10); border-radius:12px; background:rgba(8,19,31,.52); }
.timeline-row:hover article, .timeline-row.selected article { border-color: rgba(59,153,255,.72); background:rgba(14,34,55,.72); }
.row-icon { width:32px; height:32px; border-radius:9px; display:grid; place-items:center; color:#8bc8ff; background:rgba(59,153,255,.08); }
.timeline-row strong, .timeline-row p { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.timeline-row strong { font-size:13px; } .timeline-row p, .timeline-row em { color:var(--text-muted); font-size:12px; font-style:normal; }
.panel-actions { gap:8px; } .panel-actions button { border:1px solid rgba(124,170,220,.14); border-radius:999px; background:rgba(8,19,31,.46); color:var(--text-soft); padding:7px 10px; font:inherit; font-size:12px; cursor:pointer; display:flex; gap:6px; align-items:center; }
/* Detail panel */
.detail-panel { min-height: 360px; }
.tabs { gap: 6px; flex-wrap: wrap; border-bottom: 1px solid rgba(124,170,220,.12); padding-bottom: 10px; }
.tab { background: transparent; color: var(--text-muted); border: 0; border-bottom: 2px solid transparent; padding: 7px 9px; font: inherit; font-size: 12px; cursor: pointer; }
.tab.active { color: var(--text); border-bottom-color: var(--blue); background: rgba(59,153,255,.07); }
.tab span { margin-left:6px; color:#8bc8ff; }
.detail-content { padding-top: 14px; min-height: 300px; }
.detail-event-layout { display:flex; flex-direction:column; gap:14px; }
.detail-hero { display:grid; grid-template-columns:54px minmax(0,1fr); gap:13px; align-items:start; }
.detail-hero h3 { margin:0 0 4px; font-size:22px; line-height:1.15; }
.detail-hero p { color:var(--text-soft); line-height:1.55; }
.detail-icon { width:48px; height:48px; border-radius:12px; border:1px solid rgba(59,153,255,.45); display:grid; place-items:center; color:#8bc8ff; background:rgba(59,153,255,.08); }
.status-chip { display:inline-flex; margin:3px 0 7px; padding:4px 8px; border-radius:999px; border:1px solid var(--border); font-size:10px; text-transform:uppercase; color:var(--text-soft); }
.investigation-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; }
.investigation-card, .meta-item { border:1px solid rgba(124,170,220,.10); background:rgba(8,19,31,.42); border-radius:12px; padding:10px; min-width:0; }
.investigation-label, .meta-grid b { font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--text-dim); margin-bottom:5px; }
.investigation-value, .meta-grid span { color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.metadata-strip .meta-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:10px; font-size:12px; }
.detail-content pre { white-space: pre-wrap; overflow:auto; margin:0; background:#030912; border:1px solid rgba(124,170,220,.14); border-radius:12px; padding:12px; color:#d7e4f5; max-height: none; }
.graph-panel details { display:block; } .graph-panel summary { cursor:pointer; color:var(--text-soft); font-weight:700; margin-bottom:14px; }
.graph-scroll { overflow-x:auto; padding-bottom:8px; }
.execution-graph-stage { position:relative; width:980px; height:370px; margin:0 auto; }
.graph-lane-label { position:absolute; left:0; font-size:10px; text-transform:uppercase; letter-spacing:.12em; color:var(--text-dim); }
.graph-links { position:absolute; inset:0; width:980px; height:350px; overflow:visible; }
.graph-link { fill:none; stroke-width:1.25; stroke-linecap:round; stroke-linejoin:round; }
.graph-link.completed { stroke:rgba(142,227,142,.58); } .graph-link.running { stroke:rgba(99,179,255,.76); } .graph-link.warning { stroke:rgba(255,210,77,.52); } .graph-link.failed { stroke:rgba(255,107,107,.58); } .graph-link.unavailable,.graph-link.skipped,.graph-link.pending { stroke:rgba(155,177,202,.24); stroke-dasharray:5 6; }
.graph-node { position:absolute; z-index:1; border-radius:12px; background:linear-gradient(180deg,rgba(15,34,54,.94),rgba(7,19,32,.96)); border:1px solid var(--border-muted); color:var(--text); display:flex; flex-direction:column; align-items:flex-start; gap:5px; text-align:left; padding:12px; cursor:pointer; }
.graph-node-main { display:flex; flex-direction:column; align-items:flex-start; gap:5px; min-width:0; width:100%; }
.node-icon { color:#8bc8ff; } .node-icon svg { width:17px; }
.graph-node-title { font-size:14px; font-weight:750; white-space:normal; overflow:visible; line-height:1.15; }
.graph-node-subtitle { font-size:12px; color:var(--text-muted); white-space:normal; overflow:visible; text-transform:none; line-height:1.25; }
.node-badge { margin-top:auto; max-width:100%; border:1px solid rgba(124,170,220,.14); border-radius:999px; padding:3px 7px; font-size:10px; color:var(--text-muted); text-transform:uppercase; }
.graph-node:hover,.graph-node.selected { border-color:var(--border-active); }
.graph-node.completed { border-color:rgba(126,226,139,.42); } .graph-node.completed .node-icon,.graph-node.completed .node-badge { color:var(--green); }
.graph-node.warning .node-icon,.graph-node.warning .node-badge { color:var(--amber); } .graph-node.failed .node-icon,.graph-node.failed .node-badge { color:var(--red); }
.graph-node.unavailable,.graph-node.skipped,.graph-node.pending { border-style:dashed; opacity:.76; }
.graph-legend { gap:14px; flex-wrap:wrap; color:var(--text-muted); font-size:11px; margin-top:12px; }
.graph-legend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; border:1px solid var(--border-muted); } .l-completed{background:var(--green)} .l-warning{background:var(--amber)} .l-failed{background:var(--red)} .l-skipped{border-style:dashed!important}
.warning-groups { display:grid; grid-template-columns: repeat(2,1fr); gap:14px; } .warning-groups h4 { margin:0 0 6px; font-size:11px; color:var(--text-muted); text-transform:uppercase; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.graph-node.lane-dimmed,.graph-link.lane-dimmed,.graph-lane-label.lane-dimmed { opacity:.48; } .graph-lane-label.lane-emphasis { color:rgba(184,213,255,.86); }
@media (max-width: 900px) { .app-shell{padding:14px; gap:14px;} .topbar{position:static; align-items:flex-start; flex-direction:column;} .run-summary{grid-template-columns:1fr; padding:18px;} .metadata-row{grid-template-columns:1fr 1fr;} .investigation-grid-main{grid-template-columns:1fr;} .detail-panel{min-height:320px;} .metadata-strip .meta-grid{grid-template-columns:1fr 1fr;} .graph-panel details:not([open]) .graph-scroll,.graph-panel details:not([open]) .graph-legend{display:none;} }
@media (max-width: 520px) { .summary-facts,.metadata-row,.investigation-grid,.metadata-strip .meta-grid,.warning-groups{grid-template-columns:1fr;} .timeline-row{grid-template-columns:1fr;} .timeline-row time,.rail{display:none;} .timeline-row article{grid-template-columns:30px minmax(0,1fr);} .timeline-row em{display:none;} .panel{padding:14px;} .transport{width:100%; justify-content:center;} }
`;
