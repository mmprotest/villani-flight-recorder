import { ReplayDashboardViewModel } from "../viewModel.js";
import { icon } from "./icons.js";
export const topBar = (vm: ReplayDashboardViewModel) =>
  `<header class="topbar"><div class="brand"><div class="brand-mark"><span>V</span></div><h1>${vm.brand.title}</h1><span class="replay-chip">${vm.brand.mode}</span></div><div class="transport"><button class="transport-play">${icon("play")}<span>${vm.topBar.playbackLabel}</span><b>⌄</b></button><div class="scrub"><i id="scrubFill"></i></div><button class="speed">${vm.topBar.speedLabel}⌄</button><button class="console-btn">${icon("external")}<span>${vm.topBar.primaryActionLabel}</span></button></div></header>`;
