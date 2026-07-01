import { escapeHtml } from "../safeHtml.js";
import { icon } from "./icons.js";
import { bottomCenter, GRAPH_HEIGHT, GRAPH_WIDTH, leftCenter, rightCenter, straightPath, topCenter, verticalDropPath, } from "../graphGeometry.js";
const markerFill = {
    completed: "rgba(142, 227, 142, 0.58)",
    running: "rgba(99, 179, 255, 0.76)",
    warning: "rgba(255, 210, 77, 0.52)",
    failed: "rgba(255, 107, 107, 0.58)",
    pending: "rgba(155, 177, 202, 0.24)",
};
function linkPath(from, to) {
    const sameLane = Math.abs(from.y - to.y) < 4;
    if (sameLane)
        return straightPath(rightCenter(from), leftCenter(to));
    return verticalDropPath(bottomCenter(from), topCenter(to), { radius: 10 });
}
export const executionGraph = (vm) => {
    const by = Object.fromEntries(vm.graph.nodes.map((n) => [n.id, n]));
    const markers = ["completed", "running", "warning", "failed", "pending"]
        .map((s) => `<marker id="arrow-${s}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="3.6" markerHeight="3.6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill="${markerFill[s]}"></path></marker>`)
        .join("");
    const laneLabels = [
        ["Recorder Pipeline", 28],
        ["Captured Run", 150],
        ["Repository", 270],
    ]
        .map(([label, y]) => `<span class="graph-lane-label" style="top:${y}px">${label}</span>`)
        .join("");
    return `<section class="panel graph-panel"><div class="panel-head"><div><h2>Execution Graph</h2><p>Recorder pipeline, captured run, and repository reconstruction</p></div><div class="graph-controls"><button>Fit</button><button class="icon-only">${icon("minus")}</button><span>100%</span><button class="icon-only">${icon("plus")}</button><button class="icon-only">${icon("fullscreen")}</button></div></div><div class="execution-graph-stage">${laneLabels}<svg class="graph-links" viewBox="0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}" aria-hidden="true"><defs>${markers}</defs>${vm.graph.links.map((l) => `<path class="graph-link ${l.status}" marker-end="url(#arrow-${l.status})" d="${linkPath(by[l.from], by[l.to])}"></path>`).join("")}</svg>${vm.graph.nodes.map((n, i) => `<button class="graph-node ${n.status} severity-${n.severity ?? "none"} ${n.severity === "unavailable" ? "unavailable" : ""} ${n.severity === "skipped" ? "skipped" : ""}" style="left:${n.x}px;top:${n.y}px;width:${n.width}px;min-height:${n.height}px" data-graph-index="${i}"><span class="node-icon">${icon(n.icon)}</span><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.subtitle)}</small>${n.severity === "minor-warning" ? '<span class="minor-warning-dot"></span>' : ""}<i class="node-badge ${n.badgeTone ?? ""}">${escapeHtml(n.badgeLabel ?? "") || icon(n.status === "failed" ? "x" : n.status === "warning" ? "warn" : n.status === "skipped" ? "skip" : "check")}</i></button>`).join("")}</div><div class="graph-legend">${vm.graph.legend.map((l) => `<span><i class="l-${l.status}"></i>${l.label}</span>`).join("")}</div></section>`;
};
