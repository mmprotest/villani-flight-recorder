import {
  event,
  extractCommand,
  extractPath,
  isTestCommand,
  makeHumanEventTitle,
  obj,
  textOf,
} from "../normalize/events.js";
import { readJsonl } from "../utils/jsonl.js";
import { blocks, contentText } from "./helpers/content.js";
import { timestampOf } from "./helpers/timestamps.js";
import { classifyTool } from "./helpers/tools.js";
import { finish } from "./generic.js";
import { FlightEvent, ParsedSession } from "./types.js";

export async function parseClaudeSession(
  sessionPath: string,
): Promise<ParsedSession> {
  const recs = await readJsonl(sessionPath);
  const events: FlightEvent[] = [];
  const warnings: string[] = [];
  let n = 0;
  const push = (e: FlightEvent) =>
    events.push({ ...e, title: e.title || makeHumanEventTitle(e) });
  for (const r of recs) {
    if (r.error) {
      const w = `Line ${r.line}: ${r.error}`;
      warnings.push(w);
      push(
        event(
          `claude-${++n}`,
          "claude",
          "error",
          "Invalid JSONL line",
          { raw: r.raw },
          { warnings: [w] },
        ),
      );
      continue;
    }
    const o = obj(r.value);
    const ts = timestampOf(o);
    const sessionId = String(o.session_id ?? "") || undefined;
    const cwd = typeof o.cwd === "string" ? o.cwd : undefined;
    if (o.hook_event_name) {
      const name = String(o.tool_name ?? "hook");
      const c = classifyTool(name, o.tool_input);
      const exitCode =
        typeof obj(o.tool_response).exit_code === "number"
          ? (obj(o.tool_response).exit_code as number)
          : undefined;
      push(
        event(
          `claude-${++n}`,
          "claude",
          exitCode && exitCode !== 0 ? "error" : c.type,
          `Claude hook: ${String(o.hook_event_name)} ${name}`,
          r.value,
          {
            timestamp: ts,
            sessionId,
            cwd,
            command: c.command,
            path: c.path,
            exitCode,
            stdout: textOf(obj(o.tool_response).stdout),
            stderr: textOf(obj(o.tool_response).stderr),
            summary: textOf(o.transcript_path),
          },
        ),
      );
      continue;
    }
    const msg = obj(o.message);
    const content = msg.content ?? o.content;
    const role = String(msg.role ?? o.type ?? "");
    const model = typeof msg.model === "string" ? msg.model : undefined;
    if (role === "user" || o.type === "user") {
      const text = contentText(content);
      if (text)
        push(
          event(
            `claude-${++n}`,
            "claude",
            "user_message",
            "User prompt",
            r.value,
            { timestamp: ts, sessionId, cwd, summary: text },
          ),
        );
      for (const b of blocks(content).filter((b) => b.type === "tool_result"))
        push(
          event(
            `claude-${++n}`,
            "claude",
            b.is_error ? "error" : "tool_result",
            b.is_error ? "Tool result error" : "Tool result",
            r.value,
            {
              timestamp: ts,
              sessionId,
              cwd,
              summary: textOf(b.content),
              warnings: b.is_error
                ? ["Tool result marked as error"]
                : undefined,
            },
          ),
        );
      continue;
    }
    if (role === "assistant" || o.type === "assistant") {
      const text = contentText(content);
      if (text)
        push(
          event(
            `claude-${++n}`,
            "claude",
            "assistant_message",
            "Assistant response",
            r.value,
            {
              timestamp: ts,
              sessionId,
              cwd,
              summary: text,
              raw: { ...o, model },
            },
          ),
        );
      for (const b of blocks(content).filter((b) => b.type === "tool_use")) {
        const name = String(b.name ?? "tool");
        const c = classifyTool(name, b.input);
        push(
          event(`claude-${++n}`, "claude", c.type, c.title ?? "", r.value, {
            timestamp: ts,
            sessionId,
            cwd,
            command: c.command,
            path: c.path,
            summary: name,
          }),
        );
      }
      continue;
    }
    const original = String(o.type ?? "unknown");
    push(
      event(
        `claude-${++n}`,
        "claude",
        "unknown",
        `Unknown Claude event: ${original}`,
        r.value,
        { timestamp: ts, sessionId, cwd, summary: textOf(o) },
      ),
    );
  }
  const out = finish(
    "claude",
    sessionPath,
    events,
    warnings,
    recs.map((r) => r.value),
  );
  const model = recs
    .map((r) => obj(obj(r.value).message).model ?? obj(r.value).model)
    .find((x) => typeof x === "string");
  if (typeof model === "string") out.model = model;
  return out;
}
