import { deriveReplayViewModel } from "./viewModel.js";
import { appShell } from "./components/appShell.js";
import { htmlTemplate } from "./htmlTemplate.js";
export function renderDashboard(session, git) {
    const vm = deriveReplayViewModel(session, git);
    return htmlTemplate(vm, appShell(vm));
}
