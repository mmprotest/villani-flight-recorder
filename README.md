# Villani Flight Recorder

Villani Flight Recorder is a black box recorder for AI coding agents. It turns local Claude Code, Codex, Pi, and git activity into a static replay of what happened in your repo.

## What it does

- Scans local provider session JSONL files.
- Parses Claude Code, Codex, Pi, and git history into normalized events.
- Generates a static, self-contained HTML investigation report in `.villani-flight-recorder/replays/`.
- Shows prompts, assistant responses, tool calls, shell commands, file reads/edits, failed commands, warnings, unknown records, git state, and commit history where available.

## Why it exists

AI coding agents can make many local decisions quickly. This tool provides a local-first replay so a maintainer can investigate what happened without uploading transcripts or running a hosted dashboard.

## Local development and CLI usage

Install dependencies, build the TypeScript output, and run the test suite from the repo root:

```bash
npm install
npm run build
npm test
npm run typecheck
```

During local development, run the CLI through npm so it uses this checkout instead of assuming a global binary exists. The package exposes both `villani-flight-recorder` and the short `vfr` alias:

```bash
npm exec -- villani-flight-recorder scan --provider claude
npm exec -- vfr replay --provider claude --latest
npm exec -- villani-flight-recorder replay --session path/to/session.jsonl --provider codex
```

You can also run the built entry point directly after `npm run build`:

```bash
node dist/cli.js replay --session path/to/session.jsonl --provider claude
```

If you want `villani-flight-recorder` available as a shell command while working locally, link the package explicitly:

```bash
npm link
villani-flight-recorder replay --latest --provider claude
```

If the package is available from npm in your environment, `npx` can run it without a local checkout:

```bash
npx villani-flight-recorder replay --session path/to/session.jsonl --provider codex
```

Minimal transcript replay example from this repo:

```bash
npm run build
node dist/cli.js replay --session test/fixtures/claude/sample.jsonl --provider claude
```

Minimal git replay example:

```bash
npm run build
node dist/cli.js git-replay --repo . --from HEAD~1 --to HEAD
```

Example output path:

```text
.villani-flight-recorder/replays/<timestamp>-<provider>/index.html
```

## Supported providers

Provider parsers are defensive and best-effort. Unknown records are preserved in the replay instead of discarded. When reading a local transcript with `replay --session`, pass `--provider claude`, `--provider codex`, or `--provider pi` for the best provider-specific normalization; the CLI warns when a local transcript is replayed without an explicit provider.

- Claude Code: content-array text blocks, `tool_use`, `tool_result`, Bash, Read, Edit, MultiEdit, Write, NotebookEdit, Grep, Glob, and hook payload records.
- Codex: session metadata, user/assistant messages, shell tool calls/results, apply patches, approvals/permission records, MCP-like tool calls, hook payload records, and unknown rollout events.
- Pi: session start/end, messages, tool calls, tool execution start/update/end, bash failures, branch summaries, model changes, compaction/summary unknowns, and unknown events.
- Git: commit sequence, authors, timestamps, changed files, patches, final diff/stat, and deterministic change flags.

## Commands

```bash
villani-flight-recorder scan
villani-flight-recorder replay --latest
villani-flight-recorder replay --latest --open
villani-flight-recorder replay --provider claude --latest
villani-flight-recorder replay --provider codex --latest
villani-flight-recorder replay --provider pi --latest
villani-flight-recorder replay --session <path-to-jsonl> --provider <claude|codex|pi>
villani-flight-recorder git-replay --repo <repo-path> --from <ref> --to <ref>
villani-flight-recorder install-hooks
villani-flight-recorder hook <provider>
```

`scan --root <path>` requires an explicit `--provider` so one file is not parsed as multiple providers.

Default scan roots:

- Claude: `~/.claude/projects`
- Codex: `$CODEX_HOME/sessions` or `~/.codex/sessions`
- Pi: `~/.pi/agent/sessions`

## Privacy and redaction

Redaction is enabled by default and applies to messages, commands, stdout, stderr, diffs, raw JSON, warnings, and git data. Use `--no-redact` to disable it for local debugging only.

The redactor covers common API keys, provider tokens, bearer tokens, GitHub tokens, Slack tokens, npm tokens, AWS/Google-looking keys, JWT-like values, private keys, env-style assignments, credentialed connection strings, and long high-entropy strings.

## Hook installation behavior

`install-hooks` currently writes documented snippets only. Manual installation is required. No Claude, Codex, or Pi config files are modified.

Hook ingestion remains available:

```bash
cat payload.json | villani-flight-recorder hook claude
```

It writes JSONL into `.villani-flight-recorder/hooks/`, includes a received timestamp and provider, preserves the raw payload, and fails non-zero on invalid JSON.

## Git-only replay limitations

Git-only replay cannot know agent reasoning, uncommitted failed attempts, tool calls, approvals, or commands unless those details are present in commits. It does not re-execute commands and does not mutate the repository. Pass `--repo <path>` to replay a repository other than the current working directory; if omitted, the current directory is used.

## Known limitations

- Provider formats can change; unknown records are retained rather than discarded.
- Hook installation is snippets-only until provider config formats can be safely modified.
- Large stdout/stderr/diffs are truncated in the HTML view, while raw event context remains collapsed.
- Replay selection prefers sessions whose cwd matches the current repo; if uncertain, it chooses the newest session and warns.

## Troubleshooting

- If `scan --root` fails, add `--provider claude`, `--provider codex`, or `--provider pi`.
- If a local transcript replay looks generic, re-run it with `--provider claude`, `--provider codex`, or `--provider pi`.
- If Codex sessions are not found, check `CODEX_HOME`; the scanner does not rely on the path containing the word `codex`.
- If a record is unknown, open the collapsed raw JSON in the replay and file an issue with a sanitized example.

### Status model

Villani Flight Recorder separates replay processing status from captured run status. A replay can be generated successfully even when the captured AI agent run failed tests or commands; the dashboard shows recorder output status and captured run outcome as separate concepts.

## Launch flow: local session discovery and replay

Villani Flight Recorder can index local agent telemetry and build replays without manually hunting for transcript files. All indexing data stays local. By default the JSON index is stored at `path.join(os.homedir(), ".villani-flight-recorder", "index.json")`; set `VFR_HOME=<path>` or pass `--index-dir <path>` to keep scans in another local directory.

Provider session paths vary by tool and installation. Use `--root <path>` to scan fixture, custom, or team-specific telemetry locations. Discovery is conservative rather than perfect; if a manual transcript replay is uncertain, pass `--provider claude`, `--provider codex`, or `--provider pi`.

```bash
npm install
npm test
npm run build
npm run typecheck

node dist/cli.js scan --all
node dist/cli.js sessions
node dist/cli.js tasks
node dist/cli.js replay --latest
node dist/cli.js replay --session <session-id>
node dist/cli.js replay --segment <segment-id>
node dist/cli.js replay --repo <repo-path>
node dist/cli.js open

npm exec villani-flight-recorder -- scan --all
npm link
vfr scan --all
npx villani-flight-recorder scan --all
```

Common launch commands:

```bash
vfr scan --all
vfr scan --provider claude --root <path>
vfr scan --provider codex --root <path>
vfr scan --provider pi --root <path>
vfr sessions
vfr tasks
vfr replay --latest
vfr replay --session <session-id>
vfr replay --segment <segment-id>
vfr replay --repo <repo-path>
vfr open
```

Manual fallback remains available:

```bash
vfr replay --session path/to/session.jsonl --provider claude
vfr git-replay --repo . --from HEAD~1 --to HEAD --out /tmp/vfr-git-demo.html
```

`vfr scan` records source file paths, fingerprints, small titles/summaries derived from local content, inferred repos, and recorder warnings. It does not copy giant raw transcript bodies into the index or upload data.
