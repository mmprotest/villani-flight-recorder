import { GitInfo } from "../git/gitInfo.js";
import { FlightEvent } from "../providers/types.js";
function rawObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
export function changedFilesFromEvents(events: FlightEvent[]) {
  const files = new Set<string>();
  for (const e of events) {
    if (e.path) files.add(e.path);
    const raw = rawObj(e.raw);
    const text = String(raw.files ?? raw.file ?? "");
    for (const line of text.split(/\r?\n/)) {
      const name = line.trim().split(/\s+/).pop();
      if (name) files.add(name);
    }
  }
  return [...files].filter(Boolean);
}
export const changedFilesFromGit = (git: GitInfo | null) =>
  (git?.status ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
export function diffFromEvents(events: FlightEvent[]) {
  return events
    .map(
      (e) => e.diff ?? String(rawObj(e.raw).diff ?? rawObj(e.raw).patch ?? ""),
    )
    .filter(Boolean)
    .join("\n\n");
}
export const diffFromGit = (git: GitInfo | null) =>
  git?.diff || git?.diffStat || "";
