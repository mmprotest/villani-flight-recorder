import { deriveReplayViewModel } from "./viewModel.js";
import { appShell } from "./components/appShell.js";
import { htmlTemplate } from "./htmlTemplate.js";
export function renderDashboard(session, git, opts = {}) {
    const vm = deriveReplayViewModel(session, git, opts.indexStats);
    vm.returnHref = opts.returnHref;
    vm.returnLabel = opts.returnLabel;
    return htmlTemplate(vm, appShell(vm));
}
