import { GitInfo } from "../git/gitInfo.js";
import { ParsedSession } from "../providers/types.js";
import { deriveReplayViewModel } from "./viewModel.js";
import { IndexSessionStats } from "./deriveMetrics.js";
import { appShell } from "./components/appShell.js";
import { htmlTemplate } from "./htmlTemplate.js";
export function renderDashboard(
  session: ParsedSession,
  git: GitInfo | null,
  opts: {
    returnHref?: string;
    returnLabel?: string;
    indexStats?: IndexSessionStats;
  } = {},
) {
  const vm = deriveReplayViewModel(session, git, opts.indexStats);
  (vm as any).returnHref = opts.returnHref;
  (vm as any).returnLabel = opts.returnLabel;
  return htmlTemplate(vm, appShell(vm));
}
