import { ReplayDashboardViewModel, GraphNodeViewModel } from "../viewModel.js";
import { escapeHtml } from "../safeHtml.js";
import { icon } from "./icons.js";
import {
  bottomCenter,
  elbowPath,
  GRAPH_HEIGHT,
  GRAPH_WIDTH,
  leftCenter,
  rightCenter,
  straightPath,
  topCenter,
  verticalElbowPath,
} from "../graphGeometry.js";
const markerFill: Record<string, string> = {
  completed: "rgba(142, 227, 142, 0.68)",
  running: "rgba(99, 179, 255, 0.72)",
  warning: "rgba(255, 210, 77, 0.62)",
  failed: "rgba(255, 107, 107, 0.66)",
  pending: "rgba(155, 177, 202, 0.38)",
};
function linkPath(from: GraphNodeViewModel, to: GraphNodeViewModel) {
  if (from.id === "normalize" && to.id === "session-events")
    return verticalElbowPath(bottomCenter(from), topCenter(to), { radius: 10 });
  if (from.id === "git-state" && to.id === "diff-capture")
    return straightPath(bottomCenter(from), topCenter(to));
  if (from.id === "diff-capture" && to.id === "validate")
    return straightPath(leftCenter(from), rightCenter(to));
  return from.x < to.x
    ? straightPath(rightCenter(from), leftCenter(to))
    : straightPath(leftCenter(from), rightCenter(to));
}
export const executionGraph = (vm: ReplayDashboardViewModel) => {
  const by = Object.fromEntries(vm.graph.nodes.map((n) => [n.id, n]));
  const markers = ["completed", "running", "warning", "failed", "pending"]
    .map(
      (s) =>
        `<marker id="arrow-${s}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="4" markerHeight="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill="${markerFill[s]}"></path></marker>`,
    )
    .join("");
  return `<section class="panel graph-panel"><div class="panel-head"><div><h2>Execution Graph</h2><p>Replay orchestration phases</p></div><div class="graph-controls"><button>Fit</button><button class="icon-only">${icon("minus")}</button><span>100%</span><button class="icon-only">${icon("plus")}</button><button class="icon-only">${icon("fullscreen")}</button></div></div><div class="execution-graph-stage"><svg class="graph-links" viewBox="0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}" aria-hidden="true"><defs>${markers}</defs>${vm.graph.links.map((l) => `<path class="graph-link ${l.status}" marker-end="url(#arrow-${l.status})" d="${linkPath(by[l.from], by[l.to])}"></path>`).join("")}</svg>${vm.graph.nodes.map((n, i) => `<button class="graph-node ${n.status} severity-${n.severity ?? "none"} ${n.severity === "unavailable" ? "unavailable" : ""} ${n.severity === "skipped" ? "skipped" : ""}" style="left:${n.x}px;top:${n.y}px;width:${n.width}px;min-height:${n.height}px" data-graph-index="${i}"><span class="node-icon">${icon(n.icon)}</span><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.subtitle)}</small>${n.severity === "minor-warning" ? '<span class="minor-warning-dot"></span>' : ""}<i class="node-badge ${n.badgeTone ?? ""}">${escapeHtml(n.badgeLabel ?? "") || icon(n.status === "failed" ? "x" : n.status === "warning" ? "warn" : n.status === "skipped" ? "skip" : "check")}</i></button>`).join("")}</div><div class="graph-legend">${vm.graph.legend.map((l) => `<span><i class="l-${l.status}"></i>${l.label}</span>`).join("")}</div></section>`;
};
