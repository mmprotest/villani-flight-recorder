import { GitInfo } from "../git/gitInfo.js";
import { ParsedSession } from "../providers/types.js";
import { deriveReplayViewModel } from "./viewModel.js";
import { appShell } from "./components/appShell.js";
import { htmlTemplate } from "./htmlTemplate.js";
export function renderDashboard(session: ParsedSession, git: GitInfo | null) {
  const vm = deriveReplayViewModel(session, git);
  return htmlTemplate(vm, appShell(vm));
}
