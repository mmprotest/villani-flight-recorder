export const changedFilesFromGit = (git) => (git?.status ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
export const diffFromGit = (git) => git?.diff || git?.diffStat || "Not captured";
