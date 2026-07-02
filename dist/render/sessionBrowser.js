import path from "node:path";
import { escapeHtml, safeJsonForScript } from "./safeHtml.js";
const label = (p) => p === "claude"
    ? "Claude"
    : p === "codex"
        ? "Codex"
        : p === "pi"
            ? "Pi"
            : p === "generic"
                ? "Generic"
                : p;
const outcomeOf = (s) => s.outcome ?? (s.failedCommandCount > 0 ? "failed" : "unknown");
export function renderSessionBrowser(index, opts = {}) {
    const rows = index.sessions.map((s) => ({
        id: s.id,
        provider: s.provider,
        providerLabel: s.providerLabel ?? label(String(s.provider)),
        outcome: outcomeOf(s),
        project: s.projectName ??
            s.repoRoots?.[0]?.split(/[\\/]/).pop() ??
            "Unknown project",
        projectPath: s.projectPath ?? s.repoRoots?.[0] ?? "",
        title: s.title ?? s.firstPrompt ?? "Untitled session",
        updated: s.updatedAt ?? s.lastEventAt ?? s.indexedAt ?? "",
        eventCount: s.eventCount ?? 0,
        failedCommandCount: s.failedCommandCount ?? 0,
        changedFileCount: s.changedFileCount ?? s.fileEventCount ?? 0,
        model: s.model ?? "",
        sourcePath: s.sourcePath,
        replayHref: opts.replayDir && opts.browserOut
            ? path.relative(path.dirname(opts.browserOut), path.join(opts.replayDir, `${s.id}.html`))
            : `replays/${s.id}.html`,
    }));
    const providers = [...new Set(rows.map((r) => r.provider))];
    const failed = rows.filter((r) => r.outcome === "failed").length;
    const empty = rows.length === 0;
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Villani Flight Recorder Sessions</title>
<style>:root{color-scheme:light dark;--bg:#0f172a;--panel:#111c33;--text:#e5edf7;--muted:#9fb0c8;--line:#26364f;--accent:#8dd3ff}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:linear-gradient(135deg,#09111f,#17213a);color:var(--text)}main{max-width:1200px;margin:0 auto;padding:32px 20px}.hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-end}.subtitle,.muted{color:var(--muted)}.summary{display:flex;gap:12px;flex-wrap:wrap}.pill,.filters button{border:1px solid var(--line);border-radius:999px;padding:8px 12px;background:rgba(255,255,255,.06);color:var(--text)}.filters{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.filters button{cursor:pointer}.filters button.active{background:var(--accent);color:#06111f}.search{width:100%;box-sizing:border-box;border-radius:14px;border:1px solid var(--line);background:#071020;color:var(--text);padding:12px 14px;font-size:16px;margin:8px 0 18px}.table{display:grid;gap:10px}.row{display:grid;grid-template-columns:110px 100px minmax(120px,1fr) minmax(220px,2fr) 130px 80px 80px 80px 100px;gap:10px;align-items:center;border:1px solid var(--line);background:rgba(17,28,51,.9);border-radius:16px;padding:12px}.head{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em;background:transparent;border:0}.title{font-weight:700}.source{grid-column:4/-1;color:var(--muted);font-size:12px;overflow-wrap:anywhere}.open{color:var(--accent);font-weight:700}.empty{border:1px dashed var(--line);border-radius:16px;padding:28px;background:rgba(255,255,255,.04)}@media(max-width:850px){.row{grid-template-columns:1fr}.head{display:none}.source{grid-column:auto}}</style>
</head><body><main><section class="hero"><div><h1>Villani Flight Recorder</h1><p class="subtitle">Local coding-agent sessions</p></div><div class="summary"><span class="pill">${rows.length} sessions</span><span class="pill">${failed} failed</span><span class="pill">${providers.map(label).join(", ") || "No providers"}</span></div></section>
<div class="filters" aria-label="Agent filters"><button class="active" data-agent="all">All Agents</button><button data-agent="claude">Claude</button><button data-agent="codex">Codex</button><button data-agent="pi">Pi</button><button data-agent="generic">Generic</button></div>
<div class="filters" aria-label="Outcome filters"><button class="active" data-outcome="all">All Outcomes</button><button data-outcome="failed">Failed</button><button data-outcome="success">Success</button><button data-outcome="unknown">Unknown</button></div>
<input id="search" class="search" placeholder="Search title, prompt, project, path, provider" />
${empty ? `<div class="empty"><h2>No sessions indexed yet</h2><p>Run vfr scan to index local agent sessions.</p></div>` : `<section class="table"><div class="row head"><b>Agent</b><b>Outcome</b><b>Project</b><b>Title / First Prompt</b><b>Updated</b><b>Events</b><b>Failed</b><b>Files</b><b>Replay</b></div>${rows.map((r) => `<article class="row session" data-agent="${escapeHtml(r.provider)}" data-outcome="${escapeHtml(r.outcome)}" data-search="${escapeHtml([r.providerLabel, r.outcome, r.project, r.projectPath, r.title, r.sourcePath, r.model].join(" ").toLowerCase())}"><span>${escapeHtml(r.providerLabel)}</span><span>${escapeHtml(r.outcome)}</span><span>${escapeHtml(r.project)}<br><small class="muted">${escapeHtml(r.projectPath)}</small></span><span class="title">${escapeHtml(r.title)}</span><time>${escapeHtml(r.updated)}</time><span>${r.eventCount}</span><span>${r.failedCommandCount}</span><span>${r.changedFileCount}</span><a class="open" href="${escapeHtml(r.replayHref)}">Open Replay</a><small class="source">${escapeHtml(r.sourcePath)}${r.model ? ` · ${escapeHtml(r.model)}` : ""}</small></article>`).join("")}</section>`}
<script>const rows=[...document.querySelectorAll('.session')];let agent='all',outcome='all';function apply(){const q=document.getElementById('search').value.toLowerCase();rows.forEach(r=>{r.style.display=(agent==='all'||r.dataset.agent===agent)&&(outcome==='all'||r.dataset.outcome===outcome)&&r.dataset.search.includes(q)?'grid':'none'})}document.querySelectorAll('[data-agent]').forEach(b=>b.onclick=()=>{agent=b.dataset.agent;document.querySelectorAll('[data-agent]').forEach(x=>x.classList.toggle('active',x===b));apply()});document.querySelectorAll('[data-outcome]').forEach(b=>b.onclick=()=>{outcome=b.dataset.outcome;document.querySelectorAll('[data-outcome]').forEach(x=>x.classList.toggle('active',x===b));apply()});document.getElementById('search')?.addEventListener('input',apply);window.__VFR_SESSIONS__=${safeJsonForScript(rows.map(({ sourcePath, ...r }) => r))};</script></main></body></html>`;
}
