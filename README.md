# Villani Flight Recorder

Villani Flight Recorder turns local coding-agent transcripts into a searchable local session browser and static replay reports.

## Quick start

```bash
npm install -g villani-flight-recorder
vfr launch
```

This scans local Claude/Codex/Pi session directories, builds a local index, generates the session browser, and opens it.

## What it does locally

Villani Flight Recorder reads local transcript/session files, indexes the sessions it can identify, generates cached static replay reports, and writes a static HTML session browser. It does not run a server for the browser.

## View real local Claude/Codex/Pi sessions

Use `launch` for the normal workflow:

```bash
vfr launch
vfr launch --provider claude
vfr launch --provider codex
vfr launch --provider pi
vfr launch --root <path>
```

Run `vfr launch` again after new sessions. Existing unchanged replay files are reused. Use `--rebuild` to regenerate all replay files.

```bash
vfr launch --rebuild
vfr launch --no-open
```

## Manual flow

If you prefer explicit steps:

```bash
vfr scan
vfr browse
vfr replay --id <session-id>
```

Common examples:

```bash
vfr scan --provider claude
vfr sessions --provider claude --failed --limit 20
vfr browse
vfr replay --id <session-id>
```

## Browse sessions

`vfr browse` reads the local index, prepares cached replay HTML files for indexed sessions, and writes the session browser.

```bash
vfr browse
vfr browse --out ./sessions.html
```

The browser includes search, provider/outcome filters, sorting, Clear filters, Show more, a selected-session preview, and Open Replay links.

## Open a replay

From the session browser, click **Open Replay**. From the terminal, use an indexed session id:

```bash
vfr replay --id <session-id>
```

Replay pages opened from the browser include a Back to sessions link when the session browser location is known.

## Direct transcript replay

Use direct replay when you have a transcript file and do not need the session index:

```bash
vfr replay --session ./claude-session.jsonl --out ./replay.html
vfr replay --session ./codex-rollout.jsonl --provider codex --out ./codex.html
```

## Git replay

Generate a static report for a committed git range:

```bash
vfr git-replay --repo ./my-repo --from HEAD~1 --to HEAD --out ./git-replay.html
```

Git replay reports the requested committed diff range and changed files.

## Refresh and delta behavior

Run `vfr launch` again to pick up new or changed sessions. Existing unchanged replay files are reused. Use `--rebuild` to regenerate all replay files.

`vfr browse --rebuild` also forces replay regeneration while keeping the manual scan/browse workflow.

## Where files are stored

By default, files are written under:

- Index: `~/.villani-flight-recorder/index.json`
- Replay cache: `~/.villani-flight-recorder/replays/`
- Replay cache manifest: `~/.villani-flight-recorder/replays/manifest.json`
- Browser output: `~/.villani-flight-recorder/session-browser.html`

Use `--index-dir <path>` to store the index and replay cache elsewhere. Use `--out <path>` to choose the browser or replay HTML output file.

## Privacy and local data

Villani Flight Recorder reads local transcript files and writes local HTML files. It does not require a server for the session browser. Do not share generated HTML if it contains sensitive prompts, paths, commands, or diffs.

## Troubleshooting

- If no sessions are found, run `vfr launch --provider claude`, `vfr launch --provider codex`, or `vfr launch --provider pi` to narrow discovery.
- If your transcripts live somewhere custom, run `vfr launch --root <path>`.
- If replay links look stale, run `vfr launch --rebuild`.
- If you want terminal-only output, use `vfr scan`, `vfr sessions`, and `vfr replay --id <session-id>`.
- For direct transcript parsing uncertainty, pass `--provider claude`, `--provider codex`, `--provider pi`, or `--provider generic`.

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

Fixture workflow for local development:

```bash
rm -rf /tmp/vfr-dev-state /tmp/vfr-dev-out
mkdir -p /tmp/vfr-dev-out
npm exec -- vfr launch --root test/fixtures --index-dir /tmp/vfr-dev-state --out /tmp/vfr-dev-out/sessions.html --no-open
```
