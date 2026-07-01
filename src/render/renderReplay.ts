import fs from "node:fs/promises";
import path from "node:path";
import { ParsedSession } from "../providers/types.js";
import { getGitInfo } from "../git/gitInfo.js";
import { renderDashboard } from "./dashboard.js";
import { replayRoot, safeSegment } from "../utils/paths.js";
import { redactDeep } from "../redaction/redact.js";
export async function renderReplay(
  session: ParsedSession,
  opts: { cwd?: string; redact?: boolean } = {},
) {
  const cwd = opts.cwd ?? process.cwd();
  const out = path.join(
    replayRoot(cwd),
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${safeSegment(session.provider)}`,
  );
  await fs.mkdir(out, { recursive: true });
  const s = opts.redact === false ? session : redactDeep(session);
  const git = await getGitInfo(cwd);
  const file = path.join(out, "index.html");
  await fs.writeFile(
    file,
    renderDashboard(s, opts.redact === false ? git : redactDeep(git)),
    "utf8",
  );
  return file;
}
