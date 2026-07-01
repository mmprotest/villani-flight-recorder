import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { defaultRoots, findSessions } from "../src/scanners/findSessions.js";
import { appendHook } from "../src/hooks/installHooks.js";
const fx = (p: string) => path.resolve("test/fixtures", p);

describe("scanner and hooks", () => {
  it("scan --root requires provider and respects custom CODEX_HOME", async () => {
    await expect(findSessions({ roots: [fx("claude")] })).rejects.toThrow(
      /--root requires --provider/,
    );
    const s = await findSessions({ roots: [fx("claude")], provider: "claude" });
    expect(s.every((x) => x.provider === "claude")).toBe(true);
    const old = process.env.CODEX_HOME;
    process.env.CODEX_HOME = path.join(os.tmpdir(), "not_named_home");
    expect(defaultRoots("codex")[0].root).toContain("not_named_home");
    process.env.CODEX_HOME = old;
  });

  it("hook ingestion writes jsonl safely and rejects invalid json", async () => {
    const d = await fs.mkdtemp(path.join(os.tmpdir(), "vfr-hook-"));
    const file = await appendHook("claude", '{"session_id":"abc","x":1}\n', d);
    expect(file).toContain(".villani-flight-recorder");
    expect(await fs.readFile(file, "utf8")).toContain('"provider":"claude"');
    await expect(appendHook("claude", "not-json", d)).rejects.toThrow(
      /Invalid JSON/,
    );
  });
});
