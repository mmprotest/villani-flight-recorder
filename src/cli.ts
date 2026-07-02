#!/usr/bin/env node
import { Command } from "commander";
import { findSessions, chooseLatest } from "./scanners/findSessions.js";
import { parseClaudeSession } from "./providers/claude.js";
import { parseCodexSession } from "./providers/codex.js";
import { parsePiSession } from "./providers/pi.js";
import { parseGeneric } from "./providers/generic.js";
import { renderReplay } from "./render/renderReplay.js";
import { openBrowser } from "./utils/openBrowser.js";
import { buildGitReplay } from "./git/gitReplay.js";
import { installHooks, appendHook } from "./hooks/installHooks.js";
import { Provider, ParsedSession } from "./providers/types.js";
import { scanToIndex } from "./index/sessionIndex.js";
import { readIndex } from "./index/sessionStore.js";
import { adaptersFor } from "./providers/providerAdapter.js";
import fs from "node:fs/promises";
import path from "node:path";

const program = new Command();
program
  .name("villani-flight-recorder")
  .description("Black box recorder for AI coding agents")
  .version("0.1.0");
program
  .command("scan")
  .option("--all")
  .option("--agent <agent>")
  .option("--provider <provider>")
  .option(
    "--root <path>",
    "session root",
    (v, p: string[]) => [...(p ?? []), v],
    [],
  )
  .option("--since <date>")
  .option("--limit <n>")
  .option("--json")
  .option("--index-dir <path>")
  .option("--verbose")
  .action(async (o) => {
    const result = await scanToIndex({
      agent: o.agent ?? o.provider,
      all: o.all,
      roots: o.root?.length ? o.root : undefined,
      limit: o.limit ? Number(o.limit) : undefined,
      indexDir: o.indexDir,
    });
    const failedCommands = result.index.sessions.reduce(
      (n, s) => n + s.failedCommandCount,
      0,
    );
    const summary = {
      sessions: result.index.sessions.length,
      taskSegments: result.index.taskSegments.length,
      repos: result.index.repos.length,
      failedCommands,
      warnings:
        result.index.warnings.length +
        result.index.sessions.reduce((n, s) => n + s.warningCount, 0),
      indexPath: result.indexPath,
    };
    if (o.json) return console.log(JSON.stringify(summary, null, 2));
    console.log("Villani Flight Recorder scan complete\n");
    console.log("Providers scanned:");
    for (const [k, v] of Object.entries(result.counts))
      console.log(`- ${k}: ${v} sessions`);
    console.log("\nIndexed:");
    console.log(`- ${summary.sessions} sessions`);
    console.log(`- ${summary.taskSegments} likely task segments`);
    console.log(`- ${summary.repos} repos`);
    console.log(`- ${summary.failedCommands} failed commands`);
    console.log(`- ${summary.warnings} recorder warnings`);
    console.log("\nNext:\n  vfr sessions\n  vfr tasks\n  vfr replay --latest");
  });
async function parse(provider: Provider, file: string) {
  if (provider === "claude") return parseClaudeSession(file);
  if (provider === "codex") return parseCodexSession(file);
  if (provider === "pi") return parsePiSession(file);
  return parseGeneric("unknown", file);
}

function repoMatches(values: string[], q?: string) {
  if (!q) return true;
  const r = path.resolve(q);
  return values.some((v) => v === q || path.resolve(v) === r || v.includes(q));
}
async function requireIndex(dir?: string) {
  const idx = await readIndex(dir);
  if (!idx) {
    console.log("No session index found. Run: vfr scan --all");
    return null;
  }
  return idx;
}
program
  .command("sessions")
  .option("--agent <agent>")
  .option("--repo <repo>")
  .option("--limit <n>")
  .option("--json")
  .option("--index-dir <path>")
  .action(async (o) => {
    const idx = await requireIndex(o.indexDir);
    if (!idx) return;
    let rows = idx.sessions
      .filter(
        (s) =>
          (!o.agent || s.provider === o.agent) &&
          repoMatches([...s.repoRoots, ...s.repoIds], o.repo),
      )
      .sort((a, b) =>
        String(b.lastEventAt ?? "").localeCompare(String(a.lastEventAt ?? "")),
      )
      .slice(0, o.limit ? Number(o.limit) : 20);
    if (o.json) return console.log(JSON.stringify(rows, null, 2));
    if (!rows.length)
      return console.log("No sessions found. Run: vfr scan --all");
    console.log("Recent sessions\n");
    rows.forEach((s, i) => {
      const repo = idx.repos.find((r) => s.repoIds.includes(r.id));
      console.log(
        `${i + 1}. ${s.id}\n   Agent: ${s.providerLabel}\n   Repo: ${repo?.name ?? "Provider format unknown"}\n   Events: ${s.eventCount}\n   Task segments: ${s.taskSegmentIds.length}\n   Failed commands: ${s.failedCommandCount}\n   Last active: ${s.lastEventAt ?? "Duration unavailable"}\n`,
      );
    });
  });
program
  .command("tasks")
  .option("--session <session>")
  .option("--agent <agent>")
  .option("--repo <repo>")
  .option("--limit <n>")
  .option("--json")
  .option("--index-dir <path>")
  .action(async (o) => {
    const idx = await requireIndex(o.indexDir);
    if (!idx) return;
    let rows = idx.taskSegments
      .filter(
        (t) =>
          (!o.session || t.sessionId === o.session) &&
          (!o.agent || t.provider === o.agent) &&
          repoMatches([...t.repoRoots, ...t.repoIds], o.repo),
      )
      .sort((a, b) =>
        String(b.lastEventAt ?? "").localeCompare(String(a.lastEventAt ?? "")),
      )
      .slice(0, o.limit ? Number(o.limit) : 20);
    if (o.json) return console.log(JSON.stringify(rows, null, 2));
    if (!rows.length)
      return console.log("No task segments found. Run: vfr scan --all");
    console.log("Likely task segments\n");
    rows.forEach((t, i) => {
      const repo = idx.repos.find((r) => t.repoIds.includes(r.id));
      console.log(
        `${i + 1}. ${t.id}\n   Title: ${t.title}\n   Agent: ${t.provider}\n   Repo: ${repo?.name ?? "Task unavailable"}\n   Events: ${t.eventCount}\n   Failed commands: ${t.failedCommandCount}\n   Boundary: ${t.boundaryReason}\n   Time: ${t.firstEventAt ?? "Duration unavailable"} to ${t.lastEventAt ?? "Duration unavailable"}\n`,
      );
    });
  });
program
  .command("open")
  .option("--out <path>")
  .option("--index-dir <path>")
  .action(async (o) => {
    const idx = await requireIndex(o.indexDir);
    if (!idx) return;
    const out = o.out ?? path.resolve("villani-flight-recorder-index.html");
    const html = `<!doctype html><meta charset="utf-8"><title>Villani Flight Recorder Index</title><style>body{font-family:system-ui;margin:2rem;line-height:1.45}code{background:#eef;padding:.15rem .3rem;border-radius:4px}</style><h1>Villani Flight Recorder</h1><p>${idx.sessions.length} sessions · ${idx.taskSegments.length} task segments · ${idx.repos.length} repos · ${idx.sessions.reduce((n, s) => n + s.failedCommandCount, 0)} failed commands</p><h2>Recent sessions</h2><ul>${idx.sessions.map((s) => `<li><b>${s.id}</b> ${s.providerLabel} <code>vfr replay --session ${s.id}</code></li>`).join("")}</ul><h2>Likely task segments</h2><ul>${idx.taskSegments.map((t) => `<li><b>${t.title}</b> ${t.id} <code>vfr replay --segment ${t.id}</code></li>`).join("")}</ul><h2>Repos</h2><ul>${idx.repos.map((r) => `<li><b>${r.name}</b> ${r.root} <code>vfr replay --repo ${r.root}</code></li>`).join("")}</ul>`;
    await fs.writeFile(out, html);
    console.log(
      `Session browser generated:\n${out}\n\nOpen this file in your browser.`,
    );
  });
program
  .command("replay")
  .option("--latest")
  .option("--open")
  .option("--provider <provider>")
  .option("--session <path>")
  .option("--segment <segment>")
  .option("--repo <repo>")
  .option("--index-dir <path>")
  .option("--root <path>")
  .option("--out <path>")
  .option("--no-redact")
  .option("--redact")
  .action(async (o) => {
    if (!o.latest && !o.session && !o.segment && !o.repo)
      throw new Error(
        "replay requires --latest, --session <path-or-id>, --segment <id>, or --repo <path-or-id>",
      );
    let session: ParsedSession;
    let selectedSessionId: string | undefined;
    let selectedSegmentId: string | undefined;
    if (
      o.segment ||
      o.repo ||
      (o.latest && !o.root) ||
      (o.session &&
        !o.session.includes(path.sep) &&
        !o.session.endsWith(".jsonl") &&
        !o.session.endsWith(".json"))
    ) {
      const idx = await readIndex(o.indexDir);
      if (!idx) {
        console.log("No session index found. Run: vfr scan --all");
        return;
      }
      let seg = o.segment
        ? idx.taskSegments.find((t) => t.id === o.segment)
        : undefined;
      if (!seg && o.repo)
        seg = idx.taskSegments
          .filter((t) => repoMatches([...t.repoRoots, ...t.repoIds], o.repo))
          .sort((a, b) =>
            String(b.lastEventAt ?? "").localeCompare(
              String(a.lastEventAt ?? ""),
            ),
          )[0];
      if (!seg && o.latest)
        seg = idx.taskSegments
          .filter(
            (t) =>
              (!o.provider || t.provider === o.provider) &&
              repoMatches([...t.repoRoots, ...t.repoIds], o.repo),
          )
          .sort((a, b) =>
            String(b.lastEventAt ?? "").localeCompare(
              String(a.lastEventAt ?? ""),
            ),
          )[0];
      const rec = o.session
        ? idx.sessions.find((s) => s.id === o.session)
        : idx.sessions.find((s) => s.id === seg?.sessionId);
      if (!rec && !seg)
        throw new Error(
          "Replay selector did not match any indexed session or segment. Run: vfr sessions or vfr tasks",
        );
      const srec = rec ?? idx.sessions.find((s) => s.id === seg!.sessionId)!;
      const ad = adaptersFor(String(srec.provider))[0];
      session = (await ad.parse({
        provider: srec.provider,
        sourcePath: srec.sourcePath,
        sourceKind: "file",
        confidence: srec.confidence,
        reason: "indexed replay",
      })) as unknown as ParsedSession;
      selectedSessionId = srec.id;
      selectedSegmentId = seg?.id;
      if (seg)
        session.events = session.events.slice(
          seg.startEventIndex,
          seg.endEventIndex + 1,
        );
    } else if (o.session) {
      if (!o.provider) {
        for (const pr of ["claude", "codex", "pi"] as Provider[]) {
          try {
            session = await parse(pr, o.session);
            break;
          } catch {}
        }
        if (!session!)
          console.warn(
            "Warning: Provider could not be confidently detected. Re-run with --provider claude, --provider codex, or --provider pi for best results.",
          );
      }
      session =
        session! ??
        (await parse((o.provider ?? "unknown") as Provider, o.session));
    } else {
      const roots = o.root ? [o.root] : undefined;
      const picked = chooseLatest(
        await findSessions({ provider: o.provider, roots }),
      );
      if (!picked.candidate)
        throw new Error(
          `No ${o.provider ?? "supported"} sessions found under ${o.root ?? "default session roots"}.`,
        );
      if (picked.uncertain)
        console.warn(
          "Warning: repo matching was uncertain; selected most recently modified session.",
        );
      session = await parse(picked.candidate.provider, picked.candidate.path);
    }
    const file = await renderReplay(session, {
      redact: o.redact !== false,
      out: o.out,
    });
    if (o.latest) {
      console.log(`Provider: ${session.provider}`);
      console.log(`Root searched: ${o.root ?? "default session roots"}`);
      console.log(
        `Selected session: ${session.path ?? session.sessionPath ?? "unknown"}`,
      );
      console.log(`Replay written: ${file}`);
    } else {
      if (selectedSessionId || selectedSegmentId)
        console.log(
          `Replay generated\n\nSource:\n- Session: ${selectedSessionId ?? "manual"}\n- Segment: ${selectedSegmentId ?? "full session"}\n- Agent: ${session.provider}\n\nOutput:\n${file}`,
        );
      else console.log(file);
    }
    if (o.open) openBrowser(file);
  });
async function assertGitRepo(repo: string) {
  const stat = await fs.stat(repo).catch(() => null);
  if (!stat?.isDirectory())
    throw new Error(`git-replay --repo path is not a directory: ${repo}`);
  const gitDir = await fs.stat(path.join(repo, ".git")).catch(() => null);
  if (!gitDir)
    throw new Error(`git-replay --repo path is not a git repository: ${repo}`);
}
program
  .command("git-replay")
  .requiredOption("--from <ref>")
  .requiredOption("--to <ref>")
  .option("--repo <path>")
  .option("--open")
  .option("--out <path>")
  .option("--no-redact")
  .action(async (o) => {
    const repo = path.resolve(o.repo ?? process.cwd());
    await assertGitRepo(repo);
    const file = await renderReplay(await buildGitReplay(o.from, o.to, repo), {
      cwd: repo,
      redact: o.redact !== false,
      out: o.out,
    });
    console.log(file);
    if (o.open) openBrowser(file);
  });
program
  .command("install-hooks")
  .action(async () =>
    console.log(
      `Hook snippets written. Manual installation is required. No Claude, Codex, or Pi config files were modified.\nSnippet file: ${await installHooks()}`,
    ),
  );
program
  .command("hook")
  .argument("<provider>")
  .action(async (provider) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    for await (const c of process.stdin) data += c;
    console.log(await appendHook(provider, data));
  });
program.parseAsync().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
