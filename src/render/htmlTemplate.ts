import { FlightEvent, ParsedSession } from "../providers/types.js";
import { GitInfo } from "../git/gitInfo.js";

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const trunc = (s: unknown, n = 20_000) => {
  const t = String(s ?? "");
  return t.length > n
    ? `${t.slice(0, n)}\n\nOutput truncated to ${n.toLocaleString()} characters. Full raw event was larger.`
    : t;
};
function summary(events: FlightEvent[], git: GitInfo | null) {
  const filesRead = new Set(
    events.filter((e) => e.type === "file_read" && e.path).map((e) => e.path),
  );
  const filesEdited = new Set(
    events
      .filter(
        (e) =>
          ["file_edit", "file_write", "file_delete"].includes(e.type) && e.path,
      )
      .map((e) => e.path),
  );
  const commands = events.filter((e) => e.command);
  const tests = events.filter((e) => e.type === "test_run");
  const failed = events.filter(
    (e) => (e.exitCode ?? 0) !== 0 || e.type === "error",
  );
  const depFiles = [...filesEdited].filter((f) =>
    /(^|\/)(package.json|package-lock.json|pnpm-lock.yaml|yarn.lock|Cargo.toml|Cargo.lock|requirements.*\.txt|pyproject.toml|go.mod|go.sum)$/i.test(
      f ?? "",
    ),
  );
  const testFiles = [...filesEdited].filter((f) =>
    /(test|spec|__tests__)/i.test(f ?? ""),
  );
  const warnings = events.flatMap((e) => e.warnings ?? []);
  const unknown = events.filter((e) => e.type === "unknown");
  const risks = [
    depFiles.length && "Dependency file changed",
    depFiles.some((f) => /lock/i.test(f ?? "")) && "Lockfile changed",
    events.some((e) => (e.diff?.length ?? 0) > 20_000) && "Large rewrite",
    failed.length && "Tests failed",
    !tests.length && "No tests detected",
    unknown.length && "Unknown event types present",
    git?.dirty && "Repo dirty after run",
    sessionAny(events).redactionReport && "Secrets redacted",
  ].filter(Boolean);
  return {
    filesRead: filesRead.size,
    filesEdited: filesEdited.size,
    commands: commands.length,
    tests: tests.length,
    failed: failed.length,
    unknown: unknown.length,
    warnings: warnings.length,
    dirty: git?.dirty ? git.status : "",
    depFiles: depFiles.join(", "),
    testFiles: testFiles.join(", "),
    largeDiffs: events.filter((e) => (e.diff?.length ?? 0) > 20_000).length,
    finalHead: git?.head ?? "",
    risks,
  };
}
const sessionAny = (events: FlightEvent[]) =>
  events as unknown as { redactionReport?: unknown };
export function htmlTemplate(session: ParsedSession, git: GitInfo | null) {
  const warnings = [
    ...session.warnings,
    ...session.events.flatMap((e) => e.warnings ?? []),
  ];
  const events = session.events;
  const s = summary(events, git);
  const report = (session as ParsedSession & { redactionReport?: unknown })
    .redactionReport;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Villani Flight Recorder</title><style>body{margin:0;font-family:system-ui;background:#0b1020;color:#e8eefc}header{padding:14px 20px;background:#111a33;border-bottom:1px solid #2d3b66}.meta,.filters{display:flex;gap:10px;flex-wrap:wrap;font-size:13px}.pill{padding:4px 8px;border:1px solid #3c5080;border-radius:99px}.summary{padding:16px 20px;background:#0f1730;border-bottom:1px solid #263557}.grid{display:grid;grid-template-columns:30% 40% 30%;height:calc(100vh - 250px)}aside,main{overflow:auto;padding:16px;border-right:1px solid #263557}.event{display:block;width:100%;text-align:left;margin:6px 0;padding:10px;border:1px solid #33466f;background:#121b35;color:#eef;border-radius:8px}.event:hover{background:#192747}pre{white-space:pre-wrap;word-break:break-word;background:#050814;padding:12px;border-radius:8px}button,input{background:#182545;color:#eef;border:1px solid #3a4d78;border-radius:6px;padding:7px}.warn{color:#ffd166}.risk{color:#ff8fa3}</style></head><body><header><h2>Villani Flight Recorder</h2><div class="meta"><span>Provider: ${esc(session.provider)}</span><span>Repo: ${esc(git?.root ?? session.cwd ?? "")}</span><span>Branch: ${esc(git?.branch)}</span><span>Session: ${esc(session.sessionId)}</span><span>Model: ${esc(session.model)}</span><span>Started: ${esc(session.startedAt)}</span><span>Ended: ${esc(session.endedAt)}</span><span>Event count: ${events.length}</span><span>Warnings count: ${warnings.length}</span><span>Git clean/dirty: ${git ? (git.dirty ? "dirty" : "clean") : "unknown"}</span></div></header><section class="summary"><h3>Run Summary</h3><div class="meta"><span>Files read: ${s.filesRead}</span><span>Files edited: ${s.filesEdited}</span><span>Commands run: ${s.commands}</span><span>Test commands run: ${s.tests}</span><span>Failed commands: ${s.failed}</span><span>Unknown events: ${s.unknown}</span><span>Warnings: ${s.warnings}</span><span>Dirty files: ${esc(s.dirty)}</span><span>Dependency files touched: ${esc(s.depFiles)}</span><span>Test files touched: ${esc(s.testFiles)}</span><span>Large diffs: ${s.largeDiffs}</span><span>Final HEAD: ${esc(s.finalHead)}</span><span>Redaction: ${esc(JSON.stringify(report ?? {}))}</span></div><h4>Risk flags</h4><div class="meta">${s.risks.map((r) => `<span class="pill risk">${esc(r)}</span>`).join("") || "None"}</div></section><div class="grid"><aside><h3>Timeline</h3><input id="q" placeholder="Search" oninput="render()"><div class="filters">${["All", "Messages", "Files", "Commands", "Tests", "Errors", "Unknown"].map((f) => `<button onclick="filter='${f}';render()">${f}</button>`).join("")}</div><div id="list"></div></aside><main><h3 id="t"></h3><div id="d"></div></main><aside><h3>Files / Diff / Warnings</h3><p class="warn">${warnings.map(esc).join("<br>")}</p><h4>Status</h4><pre>${esc(git?.status)}</pre><h4>Diff stat</h4><pre>${esc(git?.diffStat)}</pre><h4>Recent commits</h4><pre>${esc(git?.recentCommits)}</pre><details><summary>Git diff</summary><pre>${esc(trunc(git?.diff))}</pre></details></aside></div><script>const events=${JSON.stringify(events).replace(/</g, "\\u003c")};let filter='All';function e(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}function cat(ev){if(['user_message','assistant_message'].includes(ev.type))return'Messages';if(ev.type.startsWith('file_'))return'Files';if(['bash_command'].includes(ev.type))return'Commands';if(ev.type==='test_run')return'Tests';if(ev.type==='error')return'Errors';if(ev.type==='unknown')return'Unknown';return'All'}function render(){const q=document.getElementById('q').value.toLowerCase();document.getElementById('list').innerHTML=events.map((ev,i)=>({ev,i})).filter(x=>(filter==='All'||cat(x.ev)===filter)&&(JSON.stringify(x.ev).toLowerCase().includes(q))).map(x=>'<button class="event" onclick="show('+x.i+')"><b>'+e(x.ev.title)+'</b><br><small>'+e(x.ev.type)+' '+e(x.ev.timestamp)+'</small></button>').join('')}function block(name,v){return v?'<details><summary>'+name+'</summary><pre>'+e(String(v).length>20000?String(v).slice(0,20000)+'\n\nOutput truncated to 20,000 characters. Full raw event was larger.':v)+'</pre></details>':''}function show(i){const ev=events[i];document.getElementById('t').textContent=ev.title;document.getElementById('d').innerHTML='<p><code>'+e(ev.type)+'</code></p><p>timestamp: '+e(ev.timestamp)+' provider: '+e(ev.provider)+' path: '+e(ev.path)+' command: '+e(ev.command)+' exit: '+e(ev.exitCode)+'</p><pre>'+e(ev.summary||'')+'</pre>'+block('stdout',ev.stdout)+block('stderr',ev.stderr)+block('diff',ev.diff)+block('raw JSON',JSON.stringify(ev.raw,null,2))+block('warnings',(ev.warnings||[]).join('\n'))}render();show(0)</script></body></html>`;
}
