import { escapeHtml } from "../safeHtml.js";
import { icon } from "./icons.js";
const metric = (metrics, id) => metrics.find((m) => m.id === id);
const capturedToneClass = (vm) => vm.capturedRunStatus.tone === "error"
    ? "error"
    : vm.capturedRunStatus.tone === "warning"
        ? "warning"
        : vm.capturedRunStatus.status === "not_applicable"
            ? "info"
            : "success";
const value = (m) => escapeHtml(m?.value ?? "Not captured");
const subvalue = (m) => escapeHtml(m?.subvalue ?? "");
export const metricCards = (vm) => {
    const task = metric(vm.metrics, "task");
    const model = metric(vm.metrics, "model");
    const runner = metric(vm.metrics, "runner");
    const tokens = metric(vm.metrics, "tokens");
    const cost = metric(vm.metrics, "cost");
    const duration = metric(vm.metrics, "duration");
    const runId = metric(vm.metrics, "runid");
    const optionalFacts = [tokens, cost]
        .filter((m) => Boolean(m && !m.empty))
        .map((m) => `<article><b>${value(m)}</b><span>${escapeHtml(m.label.toLowerCase())}</span></article>`)
        .join("");
    const metadata = [
        ["Task", value(task), false],
        ["Run ID", runId?.empty ? "" : value(runId), true],
    ]
        .filter(([, v]) => Boolean(v))
        .map(([label, v, mono]) => `<div><dt>${label}</dt><dd class="${mono ? "mono" : ""}">${v}</dd></div>`)
        .join("");
    const captured = vm.capturedRunStatus;
    const outcomeText = captured.status === "not_applicable"
        ? captured.label
        : `${captured.label}${captured.reason ? `: ${captured.reason}` : ""}`;
    return `<section class="run-summary ${capturedToneClass(vm)}" aria-label="Captured run summary"><div class="outcome-card"><div class="outcome-kicker">Captured run outcome</div><h2>${escapeHtml(outcomeText)}</h2><p>${escapeHtml(vm.replayStatus.label)}${vm.warnings.length ? ` with ${vm.warnings.length} recorder warning${vm.warnings.length === 1 ? "" : "s"}` : ""}</p></div><div class="summary-facts"><article><b>${escapeHtml(String(vm.rawEvents.length))}</b><span>events captured</span></article><article><b>${value(runner)}</b><span>provider</span></article><article><b>${value(model)}</b><span>${subvalue(model) || "model"}</span></article><article><b>${value(duration)}</b><span>duration</span></article>${optionalFacts}</div>${metadata ? `<dl class="metadata-row">${metadata}</dl>` : ""}${captured.reason ? `<div class="summary-note">${icon(capturedToneClass(vm) === "error" ? "x" : capturedToneClass(vm) === "warning" ? "warn" : "check")}<span>${escapeHtml(captured.reason)}</span></div>` : ""}</section>`;
};
