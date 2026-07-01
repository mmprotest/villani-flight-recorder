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
export function deriveTimeline(
  events: FlightEvent[],
): TimelineEventViewModel[] {
  return events.map((e): TimelineEventViewModel => ({
    id: e.id,
    timestamp: e.timestamp,
    title: e.title,
    subtitle: e.summary || e.command || e.path || e.type,
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
    detail: { title: e.title, summary: e.summary, raw: e },
    raw: e,
  }));
}
