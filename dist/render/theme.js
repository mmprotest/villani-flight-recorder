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
   App shell
   ========================================================= */
.app-shell {
  max-width: 1760px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 16px 20px;
  display: grid;
  grid-template-rows: 56px 118px minmax(490px, 1fr) 190px;
  gap: 10px;
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(360px, 0.86fr) minmax(760px, 2.14fr);
  gap: 10px;
  min-height: 0;
}

.panel,
.metric-card {
  background: linear-gradient(180deg, var(--panel-strong), rgba(5, 14, 24, 0.88));
  border: 1px solid var(--border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 18px 60px rgba(0, 0, 0, 0.24);
}

.panel {
  border-radius: 14px;
  padding: 14px;
  min-height: 0;
  overflow: hidden;
}

.panel-head,
.panel-actions,
.graph-controls,
.tabs,
.graph-legend,
.topbar,
.brand,
.transport,
.metric-label {
  display: flex;
  align-items: center;
}

.panel-head {
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel h2 {
  margin: 0 0 2px;
  font-size: 17px;
}

.panel p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

/* =========================================================
   Top bar
   ========================================================= */
.topbar {
  justify-content: space-between;
}

.brand {
  gap: 12px;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border-active);
  border-radius: 10px;
  display: grid;
  place-items: center;
  box-shadow: var(--glow-blue);
}

h1 {
  margin: 0;
  font-size: 24px;
}

.replay-chip {
  font-size: 11px;
  font-weight: 800;
  color: #63b3ff;
  border: 1px solid rgba(59, 153, 255, 0.5);
  border-radius: 999px;
  padding: 6px 10px;
}

.transport {
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(18, 35, 54, 0.78), rgba(6, 15, 26, 0.88));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), var(--glow-blue);
  padding: 4px;
}

.transport button,
.panel-actions button,
.graph-controls button,
.graph-controls span {
  height: 34px;
  border: 0;
  background: transparent;
  color: var(--text-soft);
  padding: 0 12px;
  font: inherit;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.scrub {
  width: 150px;
  height: 6px;
  border-radius: 99px;
  background: rgba(124, 170, 220, 0.16);
  overflow: hidden;
}

.scrub i {
  display: block;
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--blue), #8bc8ff);
  box-shadow: var(--glow-blue);
}

.speed {
  border-left: 1px solid var(--border) !important;
  border-right: 1px solid var(--border) !important;
}

.icon-only {
  width: 34px !important;
  padding: 0 !important;
  justify-content: center;
}

/* =========================================================
   Metric cards
   ========================================================= */
.metric-grid {
  display: grid;
  grid-template-columns: minmax(190px, 1.28fr) minmax(150px, 0.95fr) minmax(155px, 1fr) minmax(220px, 1.42fr) minmax(160px, 1fr) minmax(190px, 1.2fr) minmax(145px, 0.9fr) minmax(200px, 1.2fr);
  gap: 8px;
}

.metric-card {
  position: relative;
  min-height: 104px;
  border-radius: 10px;
  padding: 14px 13px;
  overflow: hidden;
}

.metric-label {
  gap: 7px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.metric-label svg {
  width: 15px;
  color: #63b3ff;
}

.metric-value {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-sub {
  margin-top: 5px;
  color: #8796aa;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-card-body {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.status-stack-row {
  display: grid;
  grid-template-columns: 10px 1fr;
  column-gap: 8px;
  align-items: start;
}

.status-stack-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.status-stack-value {
  font-size: 13px;
  color: var(--text);
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
}

.status-dot {
  width: 8px;
  height: 8px;
  margin-top: 4px;
  border-radius: 999px;
  background: var(--blue);
  box-shadow: 0 0 10px rgba(59, 153, 255, 0.4);
}

.status-dot.success {
  background: var(--green);
}

.status-dot.warning {
  background: var(--amber);
}

.status-dot.error {
  background: var(--red);
}

.success .metric-value {
  color: var(--green);
}

.warning .metric-value {
  color: var(--amber);
}

.error .metric-value {
  color: var(--red);
}

.spark {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 92px;
  height: 24px;
}

.spark path {
  stroke: rgba(99, 179, 255, 0.35);
  stroke-width: 2;
}

/* =========================================================
   Timeline
   ========================================================= */
.timeline-list {
  position: relative;
  height: 420px;
  overflow: auto;
  padding-right: 4px;
}

.timeline-list::before {
  content: "";
  position: absolute;
  left: 104px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: var(--border);
}

.timeline-row {
  display: grid;
  grid-template-columns: 82px 44px 1fr;
  align-items: center;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  margin: 0 0 6px;
  padding: 0;
  cursor: pointer;
}

.timeline-row time {
  color: var(--text-muted);
  font-size: 11px;
}

.rail {
  z-index: 1;
  display: grid;
  place-items: center;
}

.rail i {
  width: 23px;
  height: 23px;
  border-radius: 50%;
  border: 1px solid var(--border-muted);
  background: #07111d;
  display: grid;
  place-items: center;
}

.rail svg {
  width: 14px;
}

.completed .rail i {
  color: #06130d;
  background: var(--green);
}

.warning .rail i,
.severity-minor-warning .rail i {
  color: var(--amber);
  border-color: var(--border-warning);
}

.failed .rail i {
  color: var(--red);
  border-color: rgba(255, 107, 107, 0.7);
}

.timeline-row article {
  height: 54px;
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(124, 170, 220, 0.12);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(15, 31, 48, 0.72), rgba(8, 18, 30, 0.72));
}

.timeline-row:hover article,
.timeline-row.selected article {
  border-color: var(--border-active);
  box-shadow: 0 0 24px rgba(59, 153, 255, 0.14);
}

.row-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #63b3ff;
  background: rgba(59, 153, 255, 0.08);
}

.timeline-row strong {
  display: block;
  font-size: 12px;
}

.timeline-row p {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 360px;
}

.timeline-row em {
  font-style: normal;
  color: var(--text-soft);
  font-size: 11px;
}

/* =========================================================
   Execution graph
   ========================================================= */
.execution-graph-stage {
  position: relative;
  height: 430px;
  width: 1040px;
  margin: 0 auto;
}

.graph-lane-label {
  position: absolute;
  left: 0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.graph-links {
  position: absolute;
  inset: 0;
  width: 1040px;
  height: 390px;
  overflow: visible;
}

.graph-link {
  fill: none;
  stroke-width: 1.25;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.graph-link.completed {
  stroke: rgba(142, 227, 142, 0.58);
}

.graph-link.running {
  stroke: rgba(99, 179, 255, 0.76);
  filter: drop-shadow(0 0 5px rgba(59, 153, 255, 0.30));
}

.graph-link.warning {
  stroke: rgba(255, 210, 77, 0.52);
}

.graph-link.failed {
  stroke: rgba(255, 107, 107, 0.58);
}

.graph-link.unavailable,
.graph-link.skipped,
.graph-link.pending {
  stroke: rgba(155, 177, 202, 0.24);
  stroke-dasharray: 5 6;
}

.graph-node {
  position: absolute;
  z-index: 1;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(15, 34, 54, 0.94), rgba(7, 19, 32, 0.96));
  border: 1px solid var(--border-muted);
  color: var(--text);
  display: grid;
  grid-template-columns: 30px 1fr;
  grid-template-rows: 1fr 22px;
  gap: 0 8px;
  text-align: left;
  padding: 12px 10px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 16px 34px rgba(0, 0, 0, 0.24);
  cursor: pointer;
}

.graph-node:hover,
.graph-node.selected {
  border-color: var(--border-active);
  box-shadow: var(--glow-blue);
}

.node-icon {
  grid-row: 1 / 3;
  align-self: center;
  color: #63b3ff;
}

.graph-node b {
  font-size: 13px;
}

.graph-node small {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.node-badge {
  position: absolute;
  right: 8px;
  top: 7px;
  font-size: 9px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.node-badge svg {
  width: 15px;
}

.node-badge.minor-warning {
  color: var(--amber);
}

.graph-node.completed {
  border-color: var(--border-success);
  box-shadow: var(--glow-green);
}

.graph-node.completed .node-icon,
.graph-node.completed .node-badge {
  color: var(--green);
}

.graph-node.warning {
  border-color: var(--border-warning);
  box-shadow: var(--glow-amber);
}

.graph-node.warning .node-icon,
.graph-node.warning .node-badge {
  color: var(--amber);
}

.graph-node.failed {
  border-color: rgba(255, 107, 107, 0.8);
  box-shadow: 0 0 24px rgba(255, 107, 107, 0.16);
}

.graph-node.failed .node-icon,
.graph-node.failed .node-badge {
  color: var(--red);
}

.graph-node.severity-minor-warning {
  border-color: rgba(142, 227, 142, 0.46);
}

.graph-node.severity-minor-warning .node-icon {
  color: var(--green);
}

.minor-warning-dot {
  position: absolute;
  right: 10px;
  bottom: 9px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 210, 77, 0.9);
  box-shadow: 0 0 10px rgba(255, 210, 77, 0.25);
}

.graph-node.unavailable,
.graph-node.skipped,
.graph-node.pending {
  border-style: dashed;
  border-color: rgba(155, 177, 202, 0.22);
  opacity: 0.74;
}

.graph-legend {
  gap: 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(5, 14, 24, 0.72);
  padding: 8px 12px;
  color: var(--text-muted);
  font-size: 11px;
  width: max-content;
}

.graph-legend i {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  margin-right: 5px;
  border: 1px solid var(--border-muted);
}

.l-completed {
  background: var(--green);
}

.l-warning {
  background: var(--amber);
}

.l-failed {
  background: var(--red);
}

.l-skipped {
  border-style: dashed !important;
}

/* =========================================================
   Detail panel
   ========================================================= */
.detail-panel {
  height: 190px;
}

.tabs {
  gap: 6px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.tab {
  background: transparent;
  color: var(--text-muted);
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 6px 9px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.tab.active {
  color: var(--text);
  border-bottom-color: var(--blue);
  background: rgba(59, 153, 255, 0.07);
}

.tab span {
  margin-left: 6px;
  color: #63b3ff;
}

.detail-content {
  padding-top: 10px;
  height: 128px;
  overflow: auto;
}

.detail-hero {
  display: grid;
  grid-template-columns: 54px minmax(260px, 1fr) minmax(340px, 0.9fr);
  align-items: start;
  gap: 12px;
}

.detail-hero h3 {
  margin: 0 0 2px;
  font-size: 15px;
}

.detail-hero p {
  line-height: 1.45;
}

.detail-icon {
  width: 48px;
  height: 48px;
  border-radius: 11px;
  border: 1px solid var(--border-active);
  display: grid;
  place-items: center;
  color: #63b3ff;
  background: linear-gradient(180deg, rgba(59, 153, 255, 0.14), rgba(59, 153, 255, 0.04));
  box-shadow: var(--glow-blue);
}

.status-chip {
  display: inline-flex;
  margin: 3px 0 6px;
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 10px;
  text-transform: uppercase;
}

.meta-grid {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 6px 10px;
  font-size: 12px;
}

.meta-grid b {
  color: var(--text-muted);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.09em;
}

.meta-grid span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warning-groups {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.warning-groups h4 {
  margin: 0 0 6px;
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.1em;
}

.warning-groups ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
}

.redaction-summary p {
  margin: 0;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 12px;
  width: max-content;
  color: var(--text-soft);
  background: rgba(124, 170, 220, 0.06);
}

/* =========================================================
   Code blocks
   ========================================================= */
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.detail-content pre {
  white-space: pre;
  word-break: normal;
  margin: 0;
  background: #030912;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  max-height: 116px;
  overflow: auto;
  color: #d7e4f5;
}

/* =========================================================
   Responsive
   ========================================================= */
@media (max-width: 1280px) {
  .metric-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .main-grid {
    grid-template-columns: 1fr;
  }

  .app-shell {
    grid-template-rows: auto auto auto 190px;
  }

  .graph-panel {
    overflow: auto;
  }
}
`;
