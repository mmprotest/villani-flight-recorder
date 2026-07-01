import { ReplayDashboardViewModel, MetricCardViewModel } from "../viewModel.js";
import { escapeHtml } from "../safeHtml.js";
import { icon } from "./icons.js";

const statusDot = (tone?: MetricCardViewModel["tone"]) =>
  `<span class="status-dot ${tone ?? "info"}"></span>`;

const statusCard = (vm: ReplayDashboardViewModel, m: MetricCardViewModel) => {
  const capturedTone =
    vm.capturedRunStatus.tone === "error"
      ? "error"
      : vm.capturedRunStatus.tone === "warning"
        ? "warning"
        : vm.capturedRunStatus.status === "not_applicable"
          ? "info"
          : "success";
  const capturedValue =
    vm.capturedRunStatus.status === "not_applicable"
      ? vm.capturedRunStatus.label
      : `${vm.capturedRunStatus.label}${vm.capturedRunStatus.reason ? `, ${vm.capturedRunStatus.reason}` : ""}`;
  return `<article class="metric-card status-card ${m.tone ?? ""}"><div class="metric-label">${icon(m.icon)}<span>${escapeHtml(m.label)}</span></div><div class="status-card-body"><div class="status-stack-row"><div class="status-stack-label">${statusDot(m.tone)}REPLAY</div><div class="status-stack-value">${escapeHtml(vm.replayStatus.label)}</div></div><div class="status-stack-row"><div class="status-stack-label">${statusDot(capturedTone)}CAPTURED</div><div class="status-stack-value">${escapeHtml(capturedValue)}</div></div></div></article>`;
};

const normalCard = (m: MetricCardViewModel) =>
  `<article class="metric-card ${m.tone ?? ""} ${m.id === "runid" ? "run-id" : ""} ${m.empty ? "is-empty" : ""}"><div class="metric-label">${icon(m.icon)}<span>${escapeHtml(m.label)}</span></div><div class="metric-value" data-empty="${m.empty ? "true" : "false"}">${escapeHtml(m.value)}</div><div class="metric-sub">${escapeHtml(m.subvalue ?? "")}</div>${m.id === "tokens" && m.telemetryAvailable ? '<svg class="spark" viewBox="0 0 92 24"><path d="M2 18 C22 6 42 22 62 9 S82 16 90 7"/></svg>' : ""}</article>`;

export const metricCards = (vm: ReplayDashboardViewModel) =>
  `<section class="metric-grid">${vm.metrics.map((m) => (m.id === "status" ? statusCard(vm, m) : normalCard(m))).join("")}</section>`;
