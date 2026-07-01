import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { event } from "../normalize/events.js";
const exec = promisify(execFile);
async function git(args, cwd = process.cwd()) { return (await exec("git", args, { cwd, maxBuffer: 30_000_000 })).stdout.trim(); }
export async function buildGitReplay(from, to, cwd = process.cwd()) { const root = await git(["rev-parse", "--show-toplevel"], cwd); const range = `${from}..${to}`; const shas = (await git(["rev-list", "--reverse", range], root)).split(/\n/).filter(Boolean); const events = []; let n = 0; for (const sha of shas) {
    const meta = await git(["show", "--no-patch", "--format=%H%n%an <%ae>%n%aI%n%s", sha], root);
    const files = await git(["show", "--name-status", "--format=", sha], root);
    const patch = await git(["show", "--format=", "--patch", sha], root);
    const [full, author, timestamp, subject] = meta.split("\n");
    events.push(event(`git-${++n}`, "git", "git_commit", `Commit ${subject}`, { sha: full, author, timestamp, files }, { timestamp, summary: `${full.slice(0, 8)} ${subject}\n${author}\n${files}`, diff: patch }));
} events.push(event(`git-${++n}`, "git", "diff", "Final diff captured", {}, { diff: await git(["diff", from, to], root), summary: "Git-only replay: reasoning, tool calls, failed attempts, and shell commands are unknown unless committed." })); return { provider: "git", cwd: root, sessionId: range, events, warnings: ["Git-only replay cannot know agent reasoning, uncommitted failed attempts, tool calls, approvals, or commands unless captured in git history."] }; }
