# Villani Flight Recorder

Villani Flight Recorder is a black box recorder for AI coding agents. It turns local Claude Code, Codex, Pi, and git activity into a static replay of what happened in your repo.

It is local-first open-source CLI software: no SaaS, no hosted dashboard, no cloud upload, no accounts, and no telemetry.

## Installation

```bash
npx villani-flight-recorder
```

## Quick start

```bash
villani-flight-recorder scan
villani-flight-recorder replay --latest --open
```

HTML is written to `.villani-flight-recorder/replays/<timestamp>-<provider>/index.html`.

## Supported providers

- Claude Code JSONL sessions from `~/.claude/projects/**/*.jsonl`
- OpenAI Codex CLI JSONL sessions from `$CODEX_HOME/sessions/**/*.jsonl` and `~/.codex/sessions/**/*.jsonl`
- Pi JSONL sessions from `~/.pi/agent/sessions/**/*.jsonl`
- Git-only replay from repository history

Provider schemas can change, so parsing is defensive: invalid JSONL lines become warnings, known message/tool/file/shell shapes become normalized events, and unrecognized records are preserved as unknown events with raw JSON available in the replay.

## Commands

```bash
villani-flight-recorder scan
villani-flight-recorder replay --latest
villani-flight-recorder replay --latest --open
villani-flight-recorder replay --provider claude --latest
villani-flight-recorder replay --provider codex --latest
villani-flight-recorder replay --provider pi --latest
villani-flight-recorder replay --session <path-to-jsonl>
villani-flight-recorder git-replay --from main --to HEAD
villani-flight-recorder install-hooks
```

## Privacy and redaction

Redaction is enabled by default before HTML is written. It detects common API keys, bearer tokens, GitHub tokens, OpenAI/Anthropic-style keys, `.env` secret values, JWT-like tokens, AWS keys, private keys, and long high-entropy strings. Use `--no-redact` only when you are sure the replay stays private.

## Git-only replay

`git-replay` creates a static replay from commit history, changed files, patches, and final diffs. It honestly cannot know the agent's reasoning, failed attempts, approvals, commands, or tool calls unless those details were committed or captured elsewhere.

## Hook installation warning

`install-hooks` writes documented local snippets under `.villani-flight-recorder/` and backs up existing snippet files. Claude and Codex snippets call `villani-flight-recorder hook <provider>`. Pi native hook support is treated as uncertain; the tool prints/writes manual guidance instead of pretending integration exists.

## Current limitations

- Provider parsers intentionally handle common JSONL shapes rather than every historical schema.
- Static HTML is self-contained and local; there is no live dashboard or sharing service.
- Session-to-repo matching depends on cwd/repo fields when providers expose them; otherwise the latest session is selected with a warning.
