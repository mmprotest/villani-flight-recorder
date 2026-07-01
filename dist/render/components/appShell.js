import { topBar } from "./topBar.js";
import { metricCards } from "./metricCards.js";
import { timeline } from "./timeline.js";
import { executionGraph } from "./executionGraph.js";
import { detailPanel } from "./detailPanel.js";
export const appShell = (vm) => `<div class="app-shell">${topBar(vm)}${metricCards(vm)}<main class="main-grid">${timeline(vm)}${executionGraph(vm)}</main>${detailPanel(vm)}</div>`;
