import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { adaptersFor } from "../providers/providerAdapter.js";
import { readIndex } from "./sessionStore.js";
import { segmentSession } from "./segmenter.js";
import { writeIndex } from "./sessionStore.js";
const exec = promisify(execFile);
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const repoId = (r) => "vfr_repo_" + hash(path.resolve(r));
const titleFrom = (events) => events.find((e) => e.type === "user_message")?.summary ||
    events.find((e) => e.summary)?.summary ||
    events[0]?.title;
async function fp(file) {
    const st = await fs.stat(file);
    const buf = await fs.readFile(file);
    return {
        sizeBytes: st.size,
        modifiedAt: st.mtime.toISOString(),
        hash: hash(buf.toString("utf8")),
    };
}
function roots(events, cwd) {
    return [
        ...new Set([cwd, ...events.map((e) => e.cwd)]
            .filter(Boolean)
            .map((r) => path.resolve(r))),
    ];
}
async function gitMeta(root) {
    const run = async (a) => {
        try {
            return (await exec("git", ["-C", root, ...a])).stdout.trim();
        }
        catch {
            return undefined;
        }
    };
    return {
        root: (await run(["rev-parse", "--show-toplevel"])) || root,
        branch: await run(["branch", "--show-current"]),
        remote: await run(["remote", "get-url", "origin"]),
    };
}
export async function scanToIndex(opts) {
    const warnings = [];
    const sessions = [];
    const repos = new Map();
    const tasks = [];
    const counts = {};
    const adapters = adaptersFor(opts.agent, opts.all);
    for (const ad of adapters)
        counts[ad.label] = 0;
    const discoveredByPath = new Map();
    if (opts.agent) {
        for (const ad of adapters) {
            const found = (await ad.discover({ roots: opts.roots, limit: opts.limit })).slice(0, opts.limit);
            for (const d of found)
                discoveredByPath.set(path.resolve(d.sourcePath), d);
        }
    }
    else {
        // Discover broadly once, then parse each file in provider order. This keeps
        // Generic as a true fallback and prevents provider-specific transcripts from
        // being indexed a second time as generic sessions.
        for (const ad of adapters) {
            const found = await ad.discover({ roots: opts.roots, limit: opts.limit });
            for (const d of found)
                discoveredByPath.set(path.resolve(d.sourcePath), d);
        }
    }
    const previous = await readIndex(opts.indexDir);
    const previousByPath = new Map(previous?.sessions.map((s) => [
        `${s.provider}:${path.resolve(s.sourcePath)}`,
        s,
    ]));
    const discovered = [...discoveredByPath.values()].slice(0, opts.limit);
    for (const base of discovered) {
        let indexed = false;
        const tryAdapters = opts.agent ? adapters : adaptersFor(undefined, true);
        for (const ad of tryAdapters) {
            if (indexed)
                break;
            try {
                const d = { ...base, provider: ad.id, reason: `${ad.id} candidate` };
                const parsed = await ad.parse(d);
                const fingerprint = await fp(d.sourcePath);
                const key = `${ad.id}:${path.resolve(d.sourcePath)}`;
                const sid = previousByPath.get(key)?.id ??
                    "vfr_sess_" +
                        hash(`${ad.id}:${path.resolve(d.sourcePath)}:${fingerprint.hash ?? `${fingerprint.modifiedAt}:${fingerprint.sizeBytes}`}`);
                const rs = roots(parsed.events, parsed.cwd);
                const repoIdsByRoot = new Map();
                for (const r0 of rs) {
                    const gm = await gitMeta(r0);
                    const id = repoId(gm.root);
                    repoIdsByRoot.set(r0, id);
                    const rec = repos.get(id) || {
                        id,
                        root: gm.root,
                        name: path.basename(gm.root),
                        remote: gm.remote,
                        branch: gm.branch,
                        sessionIds: [],
                        taskSegmentIds: [],
                    };
                    if (!rec.sessionIds.includes(sid))
                        rec.sessionIds.push(sid);
                    rec.lastEventAt = [rec.lastEventAt, parsed.events.at(-1)?.timestamp]
                        .filter(Boolean)
                        .sort()
                        .at(-1);
                    repos.set(id, rec);
                }
                const segs = segmentSession(sid, ad.id, parsed.events, repoIdsByRoot);
                for (const s of segs) {
                    tasks.push(s);
                    for (const rid of s.repoIds) {
                        const rr = repos.get(rid);
                        if (rr && !rr.taskSegmentIds.includes(s.id))
                            rr.taskSegmentIds.push(s.id);
                    }
                }
                const failedCommandCount = parsed.events.filter((e) => (e.exitCode ?? 0) !== 0 || e.type === "error").length;
                const changedFiles = [
                    ...new Set(parsed.events.map((e) => e.path).filter(Boolean)),
                ];
                const firstEventAt = parsed.startedAt ?? parsed.events.find((e) => e.timestamp)?.timestamp;
                const lastEventAt = parsed.endedAt ??
                    [...parsed.events].reverse().find((e) => e.timestamp)?.timestamp;
                sessions.push({
                    id: sid,
                    provider: ad.id,
                    providerLabel: ad.label,
                    sourcePath: d.sourcePath,
                    sourceKind: d.sourceKind,
                    sourceType: d.sourcePath.includes(`${path.sep}hooks${path.sep}`)
                        ? "hook"
                        : "transcript",
                    createdAt: firstEventAt,
                    updatedAt: lastEventAt ?? fingerprint.modifiedAt,
                    indexedAt: new Date().toISOString(),
                    projectPath: rs[0],
                    projectName: rs[0] ? path.basename(rs[0]) : undefined,
                    title: titleFrom(parsed.events),
                    firstPrompt: parsed.events.find((e) => e.type === "user_message")
                        ?.summary,
                    outcome: failedCommandCount > 0
                        ? "failed"
                        : parsed.events.length
                            ? "success"
                            : "unknown",
                    changedFileCount: changedFiles.length,
                    changedFiles,
                    model: parsed.model,
                    sourceHash: fingerprint.hash,
                    sourceSize: fingerprint.sizeBytes,
                    sourceMtimeMs: new Date(fingerprint.modifiedAt).getTime(),
                    firstEventAt,
                    lastEventAt,
                    eventCount: parsed.events.length,
                    repoRoots: rs,
                    repoIds: [...repoIdsByRoot.values()],
                    taskSegmentIds: segs.map((s) => s.id),
                    commandCount: parsed.events.filter((e) => e.command).length,
                    failedCommandCount,
                    fileEventCount: parsed.events.filter((e) => e.path || e.type.startsWith("file_")).length,
                    warningCount: parsed.warnings.length,
                    fingerprint,
                    confidence: d.confidence,
                    warnings: parsed.warnings,
                });
                counts[ad.label] = (counts[ad.label] ?? 0) + 1;
                indexed = true;
            }
            catch (e) {
                if (opts.agent)
                    warnings.push(`${base.sourcePath}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    }
    const index = {
        version: 1,
        generatedAt: new Date().toISOString(),
        sessions,
        taskSegments: tasks,
        repos: [...repos.values()],
        warnings,
    };
    const indexPath = await writeIndex(index, opts.indexDir);
    return { index, indexPath, counts };
}
