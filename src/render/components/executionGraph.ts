import { ReplayDashboardViewModel, GraphNodeViewModel } from "../viewModel.js";
import { escapeHtml } from "../safeHtml.js";
import { icon } from "./icons.js";
import {
  elbowLink,
  GRAPH_HEIGHT,
  GRAPH_WIDTH,
  horizontalLink,
  verticalDropLink,
} from "../graphGeometry.js";

const markerFill: Record<string, string> = {
  completed: "rgba(142, 227, 142, 0.58)",
  running: "rgba(99, 179, 255, 0.76)",
  warning: "rgba(255, 210, 77, 0.52)",
  failed: "rgba(255, 107, 107, 0.58)",
  pending: "rgba(155, 177, 202, 0.24)",
};
function linkPath(
  linkId: string,
  from: GraphNodeViewModel,
  to: GraphNodeViewModel,
) {
  if (linkId === "normalize-agent-events") return verticalDropLink(from, to);
  if (linkId === "commands-correlate")
    return elbowLink(from, to, { viaY: 250 });
  return horizontalLink(from, to);
}
const badge = (n: GraphNodeViewModel) =>
  n.badgeLabel ||
  (n.status === "failed"
    ? "Failed"
    : n.status === "warning"
      ? "Warning"
      : n.status === "skipped"
        ? "Skipped"
        : "Complete");
export const executionGraph = (vm: ReplayDashboardViewModel) => {
  const by = Object.fromEntries(vm.graph.nodes.map((n) => [n.id, n]));
  const markers = ["completed", "running", "warning", "failed", "pending"]
    .map(
      (s) =>
        `<marker id="arrow-${s}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="3.6" markerHeight="3.6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill="${markerFill[s]}"></path></marker>`,
    )
    .join("");
  const laneLabels = [
    ["Recorder Pipeline", 28],
    ["Captured Run", 138],
    ["Repository", 248],
  ]
    .map(
      ([label, y]) =>
        `<span class="graph-lane-label ${label === "Repository" ? `lane-${vm.graph.nodes.find((n) => n.id === "git-state")?.laneTone ?? "normal"}` : label === "Captured Run" ? `lane-${vm.graph.nodes.find((n) => n.id === "commands")?.laneTone ?? "normal"}` : "lane-normal"}" style="top:${y}px">${label}</span>`,
    )
    .join("");
  const hasIssue =
    vm.warnings.length > 0 ||
    vm.graph.nodes.some(
      (n) =>
        n.status === "warning" ||
        n.status === "failed" ||
        n.severity === "minor-warning",
    );
  const diagnosticList = vm.graph.nodes
    .map(
      (n) =>
        `<li><span>${escapeHtml(n.title)}</span><b>${escapeHtml(badge(n))}</b></li>`,
    )
    .join("");
  return `<section class="panel graph-panel"><details class="diagnostics-details${hasIssue ? " has-issue" : ""}"${hasIssue ? " open" : ""}><summary>Replay diagnostics</summary><div class="panel-head"><div><h2>Replay coverage</h2><span class="sr-only">Execution Graph</span><p>Compact check of whether parsing, normalization, provider detection, command/file evidence, git state, and replay output were preserved.</p></div></div><ul class="mobile-diagnostic-list">${diagnosticList}</ul><div class="full-graph-label">Coverage stages</div><div class="graph-scroll"><div class="execution-graph-stage graph-stage">${laneLabels}<svg class="graph-links" viewBox="0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}" aria-hidden="true"><defs>${markers}</defs>${vm.graph.links.map((l) => `<path class="graph-link ${l.status} ${l.laneTone ? `lane-${l.laneTone}` : ""}" marker-end="url(#arrow-${l.status})" d="${linkPath(l.id, by[l.from], by[l.to])}"></path>`).join("")}</svg>${vm.graph.nodes.map((n, i) => `<button class="graph-node ${n.status} severity-${n.severity ?? "none"} ${n.laneTone ? `lane-${n.laneTone}` : ""} ${n.severity === "unavailable" ? "unavailable" : ""} ${n.severity === "skipped" ? "skipped" : ""}" style="left:${n.x}px;top:${n.y}px;width:${n.width}px;min-height:${Math.max(n.height, 86)}px" data-graph-index="${i}"><span class="graph-node-main"><span class="node-icon">${icon(n.icon)}</span><b class="graph-node-title">${escapeHtml(n.title)}</b><small class="graph-node-subtitle">${escapeHtml(n.subtitle ?? "")}</small></span><i class="node-badge ${n.badgeTone ?? ""}">${escapeHtml(badge(n))}</i></button>`).join("")}</div></div><div class="graph-legend">${vm.graph.legend.map((l) => `<span><i class="l-${l.status}"></i>${l.label}</span>`).join("")}</div></details></section>`;
};
