import { ReplayDashboardViewModel } from "../viewModel.js";
import { escapeHtml } from "../safeHtml.js";
import { icon } from "./icons.js";
export const metricCards = (vm: ReplayDashboardViewModel) =>
  `<section class="metric-grid">${vm.metrics.map((m) => `<article class="metric-card ${m.tone ?? ""} ${m.id === "runid" ? "run-id" : ""}"><div class="metric-label">${icon(m.icon)}<span>${escapeHtml(m.label)}</span></div><div class="metric-value">${escapeHtml(m.value)}</div><div class="metric-sub">${escapeHtml(m.subvalue ?? "")}</div>${m.id === "tokens" && m.telemetryAvailable ? '<svg class="spark" viewBox="0 0 92 24"><path d="M2 18 C22 6 42 22 62 9 S82 16 90 7"/></svg>' : ""}</article>`).join("")}</section>`;
