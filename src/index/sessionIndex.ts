import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { adaptersFor } from "../providers/providerAdapter.js";
import { FlightEvent } from "../providers/types.js";
import { SessionIndex, RepoRecord } from "./sessionTypes.js";
import { segmentSession } from "./segmenter.js";
import { writeIndex } from "./sessionStore.js";
const exec = promisify(execFile);
const hash = (s: string) =>
  createHash("sha1").update(s).digest("hex").slice(0, 12);
const repoId = (r: string) => "vfr_repo_" + hash(path.resolve(r));
async function fp(file: string) {
  const st = await fs.stat(file);
  const buf = await fs.readFile(file);
  return {
    sizeBytes: st.size,
    modifiedAt: st.mtime.toISOString(),
    hash: hash(buf.toString("utf8")),
  };
}
function roots(events: FlightEvent[], cwd?: string) {
  return [
    ...new Set(
      [cwd, ...events.map((e) => e.cwd)]
        .filter(Boolean)
        .map((r) => path.resolve(r!)),
    ),
  ];
}
async function gitMeta(root: string) {
  const run = async (a: string[]) => {
    try {
      return (await exec("git", ["-C", root, ...a])).stdout.trim();
    } catch {
      return undefined;
    }
  };
  return {
    root: (await run(["rev-parse", "--show-toplevel"])) || root,
    branch: await run(["branch", "--show-current"]),
    remote: await run(["remote", "get-url", "origin"]),
  };
}
export async function scanToIndex(opts: {
  agent?: string;
  all?: boolean;
  roots?: string[];
  limit?: number;
  indexDir?: string;
}) {
  const warnings: string[] = [];
  const sessions = [] as SessionIndex["sessions"];
  const repos = new Map<string, RepoRecord>();
  const tasks = [] as SessionIndex["taskSegments"];
  const counts: Record<string, number> = {};
  for (const ad of adaptersFor(opts.agent, opts.all)) {
    counts[ad.label] = 0;
    const found = (
      await ad.discover({ roots: opts.roots, limit: opts.limit })
    ).slice(0, opts.limit);
    for (const d of found) {
      try {
        const parsed = await ad.parse(d);
        const fingerprint = await fp(d.sourcePath);
        const sid = "vfr_sess_" + hash(`${d.sourcePath}:${fingerprint.hash}`);
        const rs = roots(parsed.events, parsed.cwd);
        const repoIdsByRoot = new Map<string, string>();
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
          if (!rec.sessionIds.includes(sid)) rec.sessionIds.push(sid);
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
        sessions.push({
          id: sid,
          provider: ad.id,
          providerLabel: ad.label,
          sourcePath: d.sourcePath,
          sourceKind: d.sourceKind,
          firstEventAt: parsed.events.find((e) => e.timestamp)?.timestamp,
          lastEventAt: [...parsed.events].reverse().find((e) => e.timestamp)
            ?.timestamp,
          eventCount: parsed.events.length,
          repoRoots: rs,
          repoIds: [...repoIdsByRoot.values()],
          taskSegmentIds: segs.map((s) => s.id),
          commandCount: parsed.events.filter((e) => e.command).length,
          failedCommandCount: parsed.events.filter(
            (e) => (e.exitCode ?? 0) !== 0 || e.type === "error",
          ).length,
          fileEventCount: parsed.events.filter(
            (e) => e.path || e.type.startsWith("file_"),
          ).length,
          warningCount: parsed.warnings.length,
          fingerprint,
          confidence: d.confidence,
          warnings: parsed.warnings,
        });
        counts[ad.label]++;
      } catch (e) {
        warnings.push(
          `${d.sourcePath}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
  const index: SessionIndex = {
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
