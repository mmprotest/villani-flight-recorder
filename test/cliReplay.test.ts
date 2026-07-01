import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const fx = (p: string) => path.resolve("test/fixtures", p);

describe("CLI replay output workflow", () => {
  it("replay --session --out <dir> writes index.html to the requested directory", async () => {
    await exec("npm", ["run", "build"]);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vfr-out-"));
    const out = path.join(dir, "artifact");
    const { stdout } = await exec("node", [
      "dist/cli.js",
      "replay",
      "--session",
      fx("codex/realistic-rollout.jsonl"),
      "--provider",
      "codex",
      "--out",
      out,
    ]);
    const htmlPath = path.join(out, "index.html");
    expect(stdout.trim()).toBe(htmlPath);
    expect(await fs.readFile(htmlPath, "utf8")).toContain(
      "Captured run outcome",
    );
  }, 20000);

  it("replay --latest --root searches the custom root", async () => {
    await exec("npm", ["run", "build"]);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vfr-latest-"));
    const { stdout } = await exec("node", [
      "dist/cli.js",
      "replay",
      "--provider",
      "codex",
      "--latest",
      "--root",
      fx("codex"),
      "--out",
      dir,
    ]);
    expect(stdout.trim()).toBe(path.join(dir, "index.html"));
    expect(await fs.readFile(path.join(dir, "index.html"), "utf8")).toContain(
      "Codex",
    );
  }, 20000);
});
