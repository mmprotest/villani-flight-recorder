# Villani Flight Recorder

Villani Flight Recorder turns local coding-agent transcripts into a searchable local session browser and static replay reports.

It is a local flight recorder for coding-agent sessions: it reads transcript files already written by Claude, Codex, Pi, or generic JSONL-style agents, builds a local index, and writes static HTML you can open in a browser.

## What local data does it use?

VFR scans local transcript/session files from supported agent directories or from a path you provide with `--root`. Generated HTML may include prompts, commands, paths, diffs, model names, failures, and warning metadata from those transcripts.

## Quick start

```bash
npm install -g villani-flight-recorder
vfr launch
```

This scans local Claude/Codex/Pi session directories, builds a local index, generates replay HTML only where needed, writes the session browser, and opens it.

Provider-specific examples:

```bash
vfr launch --provider claude
vfr launch --provider claude --no-open
vfr launch --provider claude --rebuild
```

## View real local Claude/Codex/Pi sessions

Use `launch` as the normal workflow:

```bash
vfr launch --provider claude
vfr launch --provider codex
vfr launch --provider pi
vfr launch --all
```

Use `--root` when transcripts are in a custom folder:

```bash
vfr launch --root ./my-local-session-exports
```

## Manual flow: scan, browse, replay

If you want each step separately:

```bash
vfr scan
vfr browse
vfr replay --id <session-id>
```

Useful scan and listing commands:

```bash
vfr scan --provider claude
vfr sessions --provider claude --failed --limit 20
```

## Browse sessions

```bash
vfr browse
```

`browse` reads the index, refreshes the replay cache only where needed, and writes a static session-browser HTML file. Open Replay links point to generated replay files for that browser snapshot.

## Open a replay

From an indexed session:

```bash
vfr replay --id <session-id>
```

From a transcript file directly:

```bash
vfr replay --session ./claude-session.jsonl --out ./replay.html
```

## Refresh after new sessions

Run launch again:

```bash
vfr launch
```

Unchanged sessions are skipped before parsing and unchanged replay files are reused. Use `--rebuild` to force a full rescan and replay regeneration.

## Delta and reuse behavior

VFR stores source file size and modified time in the local index. On the next scan, unchanged files are reused from the index without reading and parsing the transcript again. New or changed files are hashed, parsed, and indexed. Missing source files are removed from the refreshed index.

Replay HTML is cached under the index directory. A replay is reused when its source hash and renderer version match; changed source files, renderer changes, or `--rebuild` regenerate replay HTML.

## Direct transcript replay

```bash
vfr replay --session ./claude-session.jsonl --out ./replay.html
vfr replay --session ./codex-rollout.jsonl --provider codex --out ./codex.html
```

Direct transcript replay is useful for one file and does not require the session browser.

## Git replay

```bash
vfr git-replay --repo ./my-repo --from HEAD~1 --to HEAD --out ./git-replay.html
```

Git replay renders the requested committed diff range. Dirty worktree changes and untracked files are not included in the requested `--from`/`--to` diff.

## Where files are stored

By default, VFR writes its index to the platform state directory used by the CLI. Replay cache files are stored in:

```text
<index-dir>/replays/
<index-dir>/replays/manifest.json
```

The default browser output is:

```text
<index-dir>/session-browser.html
```

Override storage/output paths with:

```bash
vfr launch --index-dir ./vfr-state --out ./sessions.html
vfr scan --index-dir ./vfr-state
vfr browse --index-dir ./vfr-state --out ./sessions.html
```

## Privacy and local data

Villani Flight Recorder reads local transcript files and writes local HTML files. It does not require a server for the session browser. Do not share generated HTML if it contains sensitive prompts, paths, commands, diffs, or model details.

Fixtures in this repository are test data. They are not your real local sessions.

## Troubleshooting

- If no sessions appear, run `vfr scan --all` or pass `--root <path>`.
- If the browser looks stale, run `vfr launch` again.
- If you need a full rebuild, run `vfr launch --rebuild` or `vfr browse --rebuild`.
- If provider detection is uncertain for a direct file, pass `--provider claude`, `--provider codex`, `--provider pi`, or `--provider generic`.
- Use `--no-open` when running in CI or over SSH.

## Developer commands

```bash
npm install
npm test
npm run build
npm run typecheck
npm run format:check
npm pack --dry-run
npm exec -- vfr --version
```
