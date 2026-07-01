# Villani Flight Recorder

Villani Flight Recorder is a black box recorder for AI coding agents. It turns local Claude Code, Codex, Pi, and git activity into a static replay of what happened in your repo.

## What it does

- Scans local provider session JSONL files.
- Parses Claude Code, Codex, Pi, and git history into normalized events.
- Generates a static, self-contained HTML investigation report in `.villani-flight-recorder/replays/`.
- Shows prompts, assistant responses, tool calls, shell commands, file reads/edits, failed commands, warnings, unknown records, git state, and commit history where available.

## Why it exists

AI coding agents can make many local decisions quickly. This tool provides a local-first replay so a maintainer can investigate what happened without uploading transcripts or running a hosted dashboard.

## Quick start

```bash
npm install
npm run build
villani-flight-recorder scan --provider claude
villani-flight-recorder replay --provider claude --latest
villani-flight-recorder replay --session path/to/session.jsonl --provider codex
```

Example output path:

```text
.villani-flight-recorder/replays/<timestamp>-<provider>/index.html
```

## Supported providers

Provider parsers are defensive and best-effort. Unknown records are preserved in the replay instead of discarded.

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
villani-flight-recorder replay --session <path-to-jsonl>
villani-flight-recorder git-replay --from <ref> --to <ref>
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

Git-only replay cannot know agent reasoning, uncommitted failed attempts, tool calls, approvals, or commands unless those details are present in commits. It does not re-execute commands and does not mutate the repository.

## Known limitations

- Provider formats can change; unknown records are retained rather than discarded.
- Hook installation is snippets-only until provider config formats can be safely modified.
- Large stdout/stderr/diffs are truncated in the HTML view, while raw event context remains collapsed.
- Replay selection prefers sessions whose cwd matches the current repo; if uncertain, it chooses the newest session and warns.

## Troubleshooting

- If `scan --root` fails, add `--provider claude`, `--provider codex`, or `--provider pi`.
- If Codex sessions are not found, check `CODEX_HOME`; the scanner does not rely on the path containing the word `codex`.
- If a record is unknown, open the collapsed raw JSON in the replay and file an issue with a sanitized example.

### Status model

Villani Flight Recorder separates replay processing status from captured run status. A replay can be generated successfully even when the captured AI agent run failed tests or commands; the dashboard shows recorder output status and captured run outcome as separate concepts.
