import { GitInfo } from "../git/gitInfo.js";
export const changedFilesFromGit = (git: GitInfo | null) =>
  (git?.status ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
export const diffFromGit = (git: GitInfo | null) =>
  git?.diff || git?.diffStat || "Not captured";
