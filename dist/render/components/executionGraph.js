import { escapeHtml } from "../safeHtml.js";
import { icon } from "./icons.js";
const center = (n, side) => side === "left"
    ? [n.x, n.y + n.height / 2]
    : side === "right"
        ? [n.x + n.width, n.y + n.height / 2]
        : side === "top"
            ? [n.x + n.width / 2, n.y]
            : [n.x + n.width / 2, n.y + n.height];
export const executionGraph = (vm) => {
    const by = Object.fromEntries(vm.graph.nodes.map((n) => [n.id, n]));
    const path = (from, to) => {
        const a = by[from], b = by[to];
        if (from === "correlate") {
            const [x1, y1] = center(a, "bottom"), [x2, y2] = center(b, "top");
            return `M ${x1} ${y1} C ${x1} ${y1 + 42}, ${x2} ${y2 - 42}, ${x2} ${y2}`;
        }
        if (from === "diff-capture") {
            const [x1, y1] = center(a, "bottom"), [x2, y2] = center(b, "top");
            return `M ${x1} ${y1} C ${x1} ${y1 + 58}, ${x2} ${y2 - 58}, ${x2} ${y2}`;
        }
        if (from === "parse") {
            const [x1, y1] = center(a, "bottom"), [x2, y2] = center(by["session-events"], "top");
            return `M ${x1} ${y1} V ${y2 - 24} Q ${x1} ${y2} ${x2} ${y2}`;
        }
        const [x1, y1] = center(a, "right"), [x2, y2] = center(b, "left");
        return `M ${x1} ${y1} L ${x2} ${y2}`;
    };
    return `<section class="panel graph-panel"><div class="panel-head"><div><h2>Execution Graph</h2><p>Replay orchestration phases</p></div><div class="graph-controls"><button>Fit</button><button class="icon-only">${icon("minus")}</button><span>100%</span><button class="icon-only">${icon("plus")}</button><button class="icon-only">${icon("fullscreen")}</button></div></div><div class="execution-graph-stage"><svg class="graph-links" viewBox="0 0 1000 420" aria-hidden="true"><defs>${["completed", "warning", "failed", "pending", "running"].map((s) => `<marker id="arrow-${s}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--link-${s})"></path></marker>`).join("")}</defs>${vm.graph.links.map((l) => `<path class="link ${l.status}" marker-end="url(#arrow-${l.status})" d="${path(l.from, l.to)}"></path>`).join("")}</svg>${vm.graph.nodes.map((n, i) => `<button class="graph-node ${n.status}" style="left:${n.x}px;top:${n.y}px;width:${n.width}px;min-height:${n.height}px" data-graph-index="${i}"><span class="node-icon">${icon(n.icon)}</span><b>${escapeHtml(n.title)}</b><small>${escapeHtml(n.subtitle)}</small><i class="node-badge">${icon(n.status === "failed" ? "x" : n.status === "warning" ? "warn" : n.status === "skipped" ? "skip" : n.status === "running" ? "ring" : "check")}</i></button>`).join("")}</div><div class="graph-legend">${vm.graph.legend.map((l) => `<span><i class="l-${l.status}"></i>${l.label}</span>`).join("")}</div></section>`;
};
