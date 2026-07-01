import { escapeHtml, truncateText } from "../safeHtml.js";
export const detailPanel = (vm) => {
    const tabs = [
        "Event Detail",
        "Changed Files",
        "Diff",
        "Raw JSON",
        "Warnings",
        "Redaction",
    ];
    return `<section class="panel detail-panel"><div class="tabs">${tabs.map((t, i) => `<button class="tab ${i === 0 ? "active" : ""}" data-tab="${t}">${t}${t === "Warnings" && vm.warnings.length ? `<span>${vm.warnings.length}</span>` : ""}</button>`).join("")}</div><div id="detailContent" class="detail-content"><div class="detail-placeholder">Initial Event Detail</div></div><template id="changedFiles">${escapeHtml(vm.changedFiles.join("\n") || "Not captured")}</template><template id="gitDiff">${escapeHtml(truncateText(vm.diff))}</template><template id="warningsData">${escapeHtml(vm.warnings.join("\n") || "None")}</template><template id="redactionData">${escapeHtml(JSON.stringify(vm.redactionReport ?? {}, null, 2))}</template></section>`;
};
