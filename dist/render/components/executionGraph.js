import { escapeHtml } from "../safeHtml.js";
const badge = (n) => n.badgeLabel ||
    (n.status === "failed"
        ? "Failed"
        : n.status === "warning"
            ? "Warning"
            : n.status === "skipped"
                ? "Skipped"
                : "Complete");
const cls = (n) => n.status === "failed"
    ? "failed"
    : n.status === "warning" || n.severity === "minor-warning"
        ? "warning"
        : n.status === "skipped" || n.severity === "skipped"
            ? "skipped"
            : n.severity === "unavailable"
                ? "not-applicable"
                : "complete";
const mark = (c) => c === "failed"
    ? "✕"
    : c === "warning"
        ? "⚠"
        : c === "skipped" || c === "not-applicable"
            ? "–"
            : "✓";
const row = (n, i = 0) => {
    const c = cls(n);
    return `<li class="coverage-row graph-node ${c}" data-graph-index="${i}"><span class="coverage-icon">${mark(c)}</span><span><span class="coverage-title graph-node-title">${escapeHtml(n.title)}</span><span class="coverage-summary graph-node-subtitle">${escapeHtml(n.subtitle ?? "Coverage stage captured")}</span></span><b class="coverage-pill">${escapeHtml(badge(n))}</b></li>`;
};
export const executionGraph = (vm) => {
    const hasIssue = vm.warnings.length > 0 ||
        vm.graph.nodes.some((n) => n.status === "warning" ||
            n.status === "failed" ||
            n.severity === "minor-warning");
    const pipeline = vm.graph.nodes.filter((n) => ["source", "parse", "normalize", "replay"].some((id) => n.id.includes(id)));
    const evidence = vm.graph.nodes.filter((n) => !pipeline.includes(n));
    return `<section class="panel graph-panel"><details class="diagnostics-details${hasIssue ? " has-issue" : ""}"><summary>${hasIssue ? `Replay generated with ${vm.warnings.length || 1} recorder warning${(vm.warnings.length || 1) === 1 ? "" : "s"}. ` : ""}View replay coverage</summary><div class="panel-head"><div><h2>Replay coverage</h2><p>Compact checklist of parser, normalization, command/file evidence, git state, and replay output.</p></div></div><div class="coverage-checklist graph-stage"><span class="sr-only">Captured Run</span><span class="sr-only">Repository</span><section class="coverage-group"><h3>Recorder Pipeline</h3><ul>${(pipeline.length ? pipeline : vm.graph.nodes.slice(0, 4)).map(row).join("")}</ul></section><section class="coverage-group"><h3>Captured evidence</h3><ul>${(evidence.length ? evidence : vm.graph.nodes.slice(4)).map((n, i) => row(n, i + (pipeline.length ? pipeline.length : 4))).join("")}</ul></section></div></details></section>`;
};
