import path from "node:path";
import { escapeHtml, safeJsonForScript } from "./safeHtml.js";
import { themeCss } from "./theme.js";
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
        changedFiles: s.changedFiles ?? [],
        model: s.model ?? "",
        sourcePath: s.sourcePath,
        replayHref: opts.replayDir && opts.browserOut
            ? path.relative(path.dirname(opts.browserOut), path.join(opts.replayDir, `${s.id}.html`))
            : `replays/${s.id}.html`,
    }));
    const providers = [...new Set(rows.map((r) => r.provider))];
    const failed = rows.filter((r) => r.outcome === "failed").length;
    const lastIndexed = index.generatedAt ||
        rows
            .map((r) => r.updated)
            .sort()
            .at(-1) ||
        "—";
    const empty = rows.length === 0;
    const data = rows.map((r) => ({
        ...r,
        search: [
            r.providerLabel,
            r.outcome,
            r.project,
            r.projectPath,
            r.title,
            r.sourcePath,
            r.model,
        ]
            .join(" ")
            .toLowerCase(),
        replayCommand: `vfr replay --id ${r.id}`,
    }));
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Villani Flight Recorder Sessions</title>
<style>${themeCss()}
.session-browser .app-shell{max-width:1320px}.browser-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end}.browser-kicker{margin:0 0 5px;color:var(--text-muted);font-size:13px}.browser-subtitle{margin:7px 0 0;color:var(--text-soft);max-width:760px;line-height:1.45}.summary-row{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}.summary-row .replay-chip b{color:var(--text)}.controls{display:grid;gap:10px;margin-top:14px}.control-line{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.control-line input,.control-line select{border:1px solid rgba(154,178,205,.22);border-radius:12px;background:rgba(255,255,255,.56);color:var(--text);padding:9px 11px;font:inherit;font-size:13px}.control-line input{min-width:min(360px,100%);flex:1}.filter-button{border:1px solid rgba(88,116,143,.22);border-radius:999px;background:rgba(255,255,255,.38);color:var(--text-soft);padding:8px 11px;font:inherit;font-size:12px;cursor:pointer}.filter-button.active{border-color:rgba(232,198,107,.78);background:rgba(232,198,107,.15);color:var(--text)}.result-count{color:var(--text-muted);font-size:13px;margin-left:auto}.browser-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}.session-table{display:grid;gap:8px}.session-row{display:grid;grid-template-columns:92px 90px minmax(110px,1fr) minmax(210px,2fr) 126px 62px 62px 62px 92px;gap:9px;align-items:center;width:100%;text-align:left;color:inherit;border:1px solid rgba(154,178,205,.14);background:rgba(255,255,255,.50);border-radius:14px;padding:11px;font:inherit;cursor:pointer}.session-row:hover,.session-row.selected{border-color:rgba(118,169,224,.62);background:rgba(88,116,143,.08)}.session-row.head{cursor:default;background:transparent;border:0;color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:800}.session-title{font-weight:800}.session-source{grid-column:4/-1;color:var(--text-dim);font-size:12px;overflow-wrap:anywhere}.provider-badge,.outcome-pill{display:inline-flex;align-items:center;width:max-content;border:1px solid rgba(88,116,143,.22);border-radius:999px;padding:5px 8px;background:rgba(255,255,255,.42);font-size:12px;font-weight:800}.outcome-pill.success{border-color:rgba(126,226,139,.50);background:rgba(145,211,154,.16)}.outcome-pill.error{border-color:rgba(240,128,128,.48);background:rgba(240,128,128,.13)}.outcome-pill.info{border-color:rgba(88,116,143,.24);background:rgba(88,116,143,.09)}.open{color:#334155;font-weight:800}.preview-panel{position:sticky;top:72px}.preview-body{display:grid;gap:12px}.preview-title{font-size:18px;font-weight:800}.preview-facts{display:grid;grid-template-columns:1fr 1fr;gap:8px}.preview-facts .meta-item b{display:block;font-size:16px}.file-list{margin:0;padding-left:18px;color:var(--text-soft);font-size:13px}.copy-command{border:1px solid rgba(154,178,205,.18);border-radius:10px;background:#f8fafc;color:var(--text-soft);padding:9px;overflow:auto;font-size:12px}.empty-filter{display:none}.empty-filter.show{display:block}@media(max-width:980px){.browser-layout{grid-template-columns:1fr}.preview-panel{position:static}.session-row{grid-template-columns:1fr 1fr}.session-row.head{display:none}.session-source{grid-column:1/-1}.browser-hero{grid-template-columns:1fr}.summary-row{justify-content:flex-start}}@media(max-width:520px){.session-row{grid-template-columns:1fr}.preview-facts{grid-template-columns:1fr}.control-line input{min-width:100%}}</style>
</head><body class="session-browser"><main class="app-shell"><section class="panel browser-hero"><div><p class="browser-kicker">Local investigation index</p><h1>Villani Flight Recorder</h1><p class="browser-subtitle">Local coding-agent sessions. Scan local transcripts, browse the investigation index, then open a static replay report for the selected session.</p></div><div class="summary-row"><span class="replay-chip"><b>${rows.length}</b> sessions</span><span class="replay-chip"><b>${failed}</b> failed</span><span class="replay-chip">${providers.map(label).join(", ") || "No providers"}</span><span class="replay-chip">Indexed ${escapeHtml(lastIndexed)}</span></div></section>
<section class="panel controls" aria-label="Session controls"><div class="control-line"><input id="search" placeholder="Search title, prompt, project, path, provider" /><span id="resultCount" class="result-count">Showing ${rows.length} of ${rows.length} sessions</span></div><div class="control-line" aria-label="Agent filters"><button class="filter-button active" data-agent="all">All Agents</button><button class="filter-button" data-agent="claude">Claude</button><button class="filter-button" data-agent="codex">Codex</button><button class="filter-button" data-agent="pi">Pi</button><button class="filter-button" data-agent="generic">Generic</button><select id="outcomeFilter" aria-label="Outcome filter"><option value="all">All Outcomes</option><option value="failed">Failed</option><option value="success">Success</option><option value="unknown">Unknown</option></select><select id="sort" aria-label="Sort sessions"><option value="updated-desc">Updated newest first</option><option value="updated-asc">Updated oldest first</option><option value="failed-desc">Failed commands</option><option value="provider-asc">Provider</option><option value="project-asc">Project</option></select></div></section>
${empty ? `<div class="empty-state"><h2>No sessions indexed yet</h2><p>Run vfr scan to index local agent sessions.</p></div>` : `<section class="browser-layout"><section class="panel session-table" aria-label="Sessions"><div class="session-row head"><b>Provider</b><b>Outcome</b><b>Project</b><b>Title / First Prompt</b><b>Updated</b><b>Events</b><b>Failed</b><b>Files</b><b>Replay</b></div><div id="sessionRows"></div><div id="emptyFilter" class="empty-state empty-filter">No sessions match the current filters.</div></section><aside class="panel preview-panel" aria-live="polite"><div class="panel-head"><div><h2>Session preview</h2><p>Select a session to inspect it before opening the replay.</p></div></div><div id="preview" class="preview-body"></div></aside></section>`}
<script>const sessions=${safeJsonForScript(data)};let agent='all';const state={outcome:'all',sort:'updated-desc',selected:sessions[0]?.id||''};const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const tone=o=>o==='success'?'success':o==='failed'?'error':'info';const rowsEl=document.getElementById('sessionRows');const previewEl=document.getElementById('preview');function visible(){const q=(document.getElementById('search')?.value||'').toLowerCase();const out=sessions.filter(s=>(agent==='all'||s.provider===agent)&&(state.outcome==='all'||s.outcome===state.outcome)&&s.search.includes(q));out.sort((a,b)=>state.sort==='updated-asc'?String(a.updated).localeCompare(String(b.updated)):state.sort==='failed-desc'?b.failedCommandCount-a.failedCommandCount:state.sort==='provider-asc'?String(a.providerLabel).localeCompare(String(b.providerLabel)):state.sort==='project-asc'?String(a.project).localeCompare(String(b.project)):String(b.updated).localeCompare(String(a.updated)));return out}function renderRows(){if(!rowsEl)return;const out=visible();document.getElementById('resultCount').textContent='Showing '+out.length+' of '+sessions.length+' sessions';document.getElementById('emptyFilter')?.classList.toggle('show',out.length===0);rowsEl.innerHTML=out.map(s=>'<button class="session-row session '+(s.id===state.selected?'selected':'')+'" data-id="'+esc(s.id)+'"><span class="provider-badge">'+esc(s.providerLabel)+'</span><span class="outcome-pill '+tone(s.outcome)+'">'+esc(s.outcome)+'</span><span>'+esc(s.project)+'<br><small class="muted">'+esc(s.projectPath)+'</small></span><span class="session-title">'+esc(s.title)+'</span><time>'+esc(s.updated)+'</time><span>'+s.eventCount+'</span><span>'+s.failedCommandCount+'</span><span>'+s.changedFileCount+'</span><a class="open" href="'+esc(s.replayHref)+'" onclick="event.stopPropagation()">Open Replay</a><small class="session-source">'+esc(s.sourcePath)+(s.model?' · '+esc(s.model):'')+'</small></button>').join('');rowsEl.querySelectorAll('.session').forEach(r=>r.addEventListener('click',()=>{state.selected=r.dataset.id;renderRows();renderPreview()}));if(out.length&&!out.some(s=>s.id===state.selected)){state.selected=out[0].id;renderRows();renderPreview()}}function renderPreview(){if(!previewEl)return;const s=sessions.find(x=>x.id===state.selected)||sessions[0];if(!s){previewEl.innerHTML='<p class="muted">No session selected.</p>';return}const files=(s.changedFiles||[]).slice(0,6);previewEl.innerHTML='<div><span class="provider-badge">'+esc(s.providerLabel)+'</span> <span class="outcome-pill '+tone(s.outcome)+'">'+esc(s.outcome)+'</span></div><div class="preview-title">'+esc(s.title)+'</div><p class="muted">'+esc(s.project)+' · '+esc(s.updated)+'</p><div class="preview-facts"><div class="meta-item"><b>'+s.eventCount+'</b><span>events</span></div><div class="meta-item"><b>'+s.failedCommandCount+'</b><span>failed commands</span></div><div class="meta-item"><b>'+s.changedFileCount+'</b><span>changed files</span></div><div class="meta-item"><b>'+esc(s.model||'—')+'</b><span>model</span></div></div>'+(files.length?'<div><h3>Changed files preview</h3><ul class="file-list">'+files.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul></div>':'')+'<div><h3>Source path</h3><p class="muted">'+esc(s.sourcePath)+'</p></div><code class="copy-command">'+esc(s.replayCommand)+'</code><a class="transport" href="'+esc(s.replayHref)+'">Open Replay</a>'}document.querySelectorAll('[data-agent]').forEach(b=>b.onclick=()=>{agent=b.dataset.agent;document.querySelectorAll('[data-agent]').forEach(x=>x.classList.toggle('active',x===b));renderRows();renderPreview()});document.getElementById('outcomeFilter')?.addEventListener('change',e=>{state.outcome=e.target.value;renderRows();renderPreview()});document.getElementById('sort')?.addEventListener('change',e=>{state.sort=e.target.value;renderRows()});document.getElementById('search')?.addEventListener('input',()=>{renderRows();renderPreview()});window.__VFR_SESSIONS__=sessions;renderRows();renderPreview();</script></main></body></html>`;
}
