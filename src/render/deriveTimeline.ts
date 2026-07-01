import { FlightEvent } from "../providers/types.js";
import { IconName } from "./components/icons.js";
import {
  fmtDuration,
  Severity,
  Status,
  TimelineEventViewModel,
} from "./viewModel.js";

export const eventStatus = (e: FlightEvent): Status =>
  e.type === "error" || (e.exitCode ?? 0) !== 0 ? "failed" : "completed";
export const eventSeverity = (e: FlightEvent): Severity =>
  e.type === "error" || (e.exitCode ?? 0) !== 0
    ? "failed"
    : e.type === "unknown" || (e.warnings?.length ?? 0) > 0
      ? "minor-warning"
      : "none";
function timelineCopy(e: FlightEvent): { title: string; subtitle: string } {
  if (e.command && (e.exitCode ?? 0) !== 0) {
    return {
      title: `Command failed: ${e.command}`,
      subtitle: "Captured command exited non-zero",
    };
  }
  if (e.command) {
    return { title: e.title, subtitle: "Captured command recorded" };
  }
  if (e.type.includes("file")) {
    return {
      title: e.title || "Captured file edit",
      subtitle: "Captured file edit",
    };
  }
  if (["git_commit", "git_status", "diff"].includes(e.type)) {
    return { title: e.title, subtitle: "Repository reconstruction" };
  }
  if (e.type === "unknown" || (e.warnings?.length ?? 0) > 0) {
    return {
      title: "Transcript parsed with warnings",
      subtitle: "Recorder recovered partial session data",
    };
  }
  if (e.type.includes("message")) {
    return { title: e.title, subtitle: "Captured agent run" };
  }
  return {
    title: e.title,
    subtitle: e.summary || e.path || "Recorder pipeline",
  };
}

export function deriveTimeline(
  events: FlightEvent[],
): TimelineEventViewModel[] {
  return events.map((e): TimelineEventViewModel => ({
    id: e.id,
    timestamp: e.timestamp,
    title: timelineCopy(e).title,
    subtitle: timelineCopy(e).subtitle,
    durationLabel: fmtDuration(e.durationMs),
    status: eventStatus(e),
    severity: eventSeverity(e),
    icon: (e.command
      ? "terminal"
      : e.type.includes("file")
        ? "edit"
        : e.type.includes("message")
          ? "review"
          : "parse") as IconName,
    eventType: e.type,
    detail: {
      title: timelineCopy(e).title,
      summary: timelineCopy(e).subtitle,
      sourceLabel:
        e.command || e.type.includes("message") || e.type.includes("file")
          ? "Captured agent run"
          : ["git_commit", "git_status", "diff"].includes(e.type)
            ? "Repository reconstruction"
            : "Recorder pipeline",
      impactLabel:
        (e.exitCode ?? 0) !== 0 || e.type === "error"
          ? "Captured run failed"
          : ["git_commit", "git_status", "diff"].includes(e.type)
            ? "Git diff captured"
            : "Replay event recorded",
      replayImpactLabel:
        (e.exitCode ?? 0) !== 0
          ? "None, replay generated successfully"
          : "Generated",
      capturedImpactLabel:
        (e.exitCode ?? 0) !== 0
          ? "Failed command/test"
          : e.command
            ? "Command/tool recorded"
            : ["git_commit", "git_status", "diff"].includes(e.type)
              ? "N/A"
              : "Captured run preserved",
      raw: e,
    },
    raw: e,
  }));
}
