import { GitInfo } from "../git/gitInfo.js";
import { FlightEvent, ParsedSession } from "../providers/types.js";
import { IconName } from "./components/icons.js";
import { deriveExecutionGraph } from "./deriveGraph.js";
import { deriveMetrics } from "./deriveMetrics.js";
import { deriveTimeline } from "./deriveTimeline.js";
import { changedFilesFromGit, diffFromGit } from "./deriveDetails.js";

export type Status =
  "completed" | "running" | "warning" | "failed" | "pending" | "skipped";
export type Severity =
  | "none"
  | "info"
  | "minor-warning"
  | "warning"
  | "failed"
  | "unavailable"
  | "skipped";
export interface DetailViewModel {
  title: string;
  summary?: string;
  meta?: Record<string, string>;
  raw?: unknown;
}
export interface MetricCardViewModel {
  id: string;
  label: string;
  value: string;
  subvalue?: string;
  icon: IconName;
  tone?: "default" | "success" | "warning" | "error" | "info";
  telemetryAvailable?: boolean;
}
export interface TimelineEventViewModel {
  id: string;
  timestamp?: string;
  title: string;
  subtitle?: string;
  durationLabel?: string;
  status: Status;
  severity?: Severity;
  icon: IconName;
  eventType: string;
  detail: DetailViewModel;
  raw: FlightEvent;
}
export interface GraphNodeViewModel {
  id: string;
  title: string;
  subtitle?: string;
  durationLabel?: string;
  status: Status;
  severity?: Severity;
  badgeLabel?: string;
  badgeTone?:
    "success" | "info" | "minor-warning" | "warning" | "error" | "muted";
  icon: IconName;
  x: number;
  y: number;
  width: number;
  height: number;
  detail: DetailViewModel;
}
export interface GraphLinkViewModel {
  id: string;
  from: string;
  to: string;
  status: Exclude<Status, "skipped">;
}
export interface ExecutionGraphViewModel {
  nodes: GraphNodeViewModel[];
  links: GraphLinkViewModel[];
  legend: { label: string; status: Status }[];
}
export interface ReplayDashboardViewModel {
  brand: { title: string; mode: "REPLAY" | "LIVE" };
  topBar: {
    playbackLabel: string;
    speedLabel: string;
    showProgress: boolean;
    primaryActionLabel: string;
  };
  metrics: MetricCardViewModel[];
  timeline: TimelineEventViewModel[];
  graph: ExecutionGraphViewModel;
  details: DetailViewModel;
  redactionReport?: unknown;
  warnings: string[];
  rawEvents: FlightEvent[];
  changedFiles: string[];
  diff: string;
  provider: string;
}

export const fmtTime = (v?: string) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
};
export const fmtDuration = (ms?: number) =>
  ms === undefined
    ? "—"
    : ms < 1000
      ? `${ms}ms`
      : `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)}s`;
const failed = (events: FlightEvent[]) =>
  events.some((e) => e.type === "error" || (e.exitCode ?? 0) !== 0);

export function deriveReplayViewModel(
  session: ParsedSession,
  git: GitInfo | null,
): ReplayDashboardViewModel {
  const events = session.events.length
    ? session.events
    : [
        {
          id: "empty",
          provider: session.provider,
          type: "unknown",
          title: "No events captured",
          summary: "Replay data was empty",
        } as FlightEvent,
      ];
  const normalizedSession = { ...session, events };
  const warnings = [
    ...session.warnings,
    ...events.flatMap((e) => e.warnings ?? []),
  ];
  const hasFail = failed(events);
  const hasWarning =
    warnings.length > 2 ||
    events.filter((e) => e.type === "unknown").length >
      Math.max(
        0,
        events.length - events.filter((e) => e.type === "unknown").length,
      );
  const timeline = deriveTimeline(events);
  return {
    brand: { title: "Villani Flight Recorder", mode: "REPLAY" },
    topBar: {
      playbackLabel: "Play",
      speedLabel: "1.0x",
      showProgress: true,
      primaryActionLabel: "Open in Console",
    },
    metrics: deriveMetrics(normalizedSession, hasFail, hasWarning),
    timeline,
    graph: deriveExecutionGraph({
      session: normalizedSession,
      git,
      htmlValid: true,
      outputWritten: true,
    }),
    details: timeline[0]?.detail ?? { title: "No event" },
    warnings,
    rawEvents: events,
    changedFiles: changedFilesFromGit(git),
    diff: diffFromGit(git),
    provider: session.provider,
    redactionReport: (session as ParsedSession & { redactionReport?: unknown })
      .redactionReport,
  };
}
