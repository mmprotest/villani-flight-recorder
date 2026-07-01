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
const program = new Command();
program
    .name("villani-flight-recorder")
    .description("Black box recorder for AI coding agents")
    .version("0.1.0");
program
    .command("scan")
    .option("--provider <provider>")
    .option("--root <path>")
    .action(async (o) => {
    const sessions = await findSessions({
        provider: o.provider,
        roots: o.root ? [o.root] : undefined,
    });
    for (const s of sessions)
        console.log(`${s.provider}\n  path: ${s.path}\n  modified: ${new Date(s.mtimeMs).toISOString()}\n  size: ${s.size}\n  cwd: ${s.cwd ?? "unknown"}\n  session: ${s.sessionId ?? "unknown"}\n  model: ${s.model ?? "unknown"}\n  events: ${s.eventCount ?? "unknown"}\n  warnings: ${s.warnings.length}\n`);
});
async function parse(provider, file) {
    if (provider === "claude")
        return parseClaudeSession(file);
    if (provider === "codex")
        return parseCodexSession(file);
    if (provider === "pi")
        return parsePiSession(file);
    return parseGeneric("unknown", file);
}
program
    .command("replay")
    .option("--latest")
    .option("--open")
    .option("--provider <provider>")
    .option("--session <path>")
    .option("--no-redact")
    .option("--redact")
    .action(async (o) => {
    if (!o.latest && !o.session)
        throw new Error("replay requires --latest or --session <path>");
    let session;
    if (o.session)
        session = await parse((o.provider ?? "unknown"), o.session);
    else {
        const picked = chooseLatest(await findSessions({ provider: o.provider }));
        if (!picked.candidate)
            throw new Error("No supported sessions found.");
        if (picked.uncertain)
            console.warn("Warning: repo matching was uncertain; selected most recently modified session.");
        session = await parse(picked.candidate.provider, picked.candidate.path);
    }
    const file = await renderReplay(session, { redact: o.redact !== false });
    console.log(file);
    if (o.open)
        openBrowser(file);
});
program
    .command("git-replay")
    .requiredOption("--from <ref>")
    .requiredOption("--to <ref>")
    .option("--open")
    .option("--no-redact")
    .action(async (o) => {
    const file = await renderReplay(await buildGitReplay(o.from, o.to), {
        redact: o.redact !== false,
    });
    console.log(file);
    if (o.open)
        openBrowser(file);
});
program
    .command("install-hooks")
    .action(async () => console.log(`Hook snippets written. Manual installation is required. No Claude, Codex, or Pi config files were modified.\nSnippet file: ${await installHooks()}`));
program
    .command("hook")
    .argument("<provider>")
    .action(async (provider) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    for await (const c of process.stdin)
        data += c;
    console.log(await appendHook(provider, data));
});
program.parseAsync().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
});
