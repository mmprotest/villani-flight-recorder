import { GitInfo } from "../git/gitInfo.js";
import { ParsedSession } from "../providers/types.js";
import { IconName } from "./components/icons.js";
import { GRAPH_COORDS } from "./graphGeometry.js";
import {
  ExecutionGraphViewModel,
  GraphLinkViewModel,
  GraphNodeViewModel,
  Severity,
  Status,
} from "./viewModel.js";
import {
  CapturedRunStatusSummary,
  ReplayStatusSummary,
} from "./statusTypes.js";
import { deriveCapturedRunStatus } from "./deriveCapturedRunStatus.js";
import { deriveReplayStatus } from "./deriveReplayStatus.js";

export interface GraphDerivationInput {
  session: ParsedSession;
  git: GitInfo | null;
  htmlValid?: boolean;
  outputWritten?: boolean;
  replayStatus?: ReplayStatusSummary;
  capturedRunStatus?: CapturedRunStatusSummary;
}

export type GraphLinkKind =
  | "recorder_pipeline"
  | "recorder_to_captured"
  | "captured_execution"
  | "captured_artifact"
  | "repo_correlation"
  | "repo_artifact"
  | "replay_output";

export interface GraphLinkDefinition {
  id: string;
  from: string;
  to: string;
  kind: GraphLinkKind;
}

export const GRAPH_LINKS: GraphLinkDefinition[] = [
  {
    id: "discover-parse",
    from: "discover",
    to: "parse",
    kind: "recorder_pipeline",
  },
  {
    id: "parse-normalize",
    from: "parse",
    to: "normalize",
    kind: "recorder_pipeline",
  },
  {
    id: "normalize-replay-output",
    from: "normalize",
    to: "replay-output",
    kind: "replay_output",
  },
  {
    id: "normalize-agent-events",
    from: "normalize",
    to: "agent-events",
    kind: "recorder_to_captured",
  },
  {
    id: "agent-events-commands",
    from: "agent-events",
    to: "commands",
    kind: "captured_execution",
  },
  {
    id: "commands-file-changes",
    from: "commands",
    to: "file-changes",
    kind: "captured_artifact",
  },
  {
    id: "commands-correlate",
    from: "commands",
    to: "correlate",
    kind: "repo_correlation",
  },
  {
    id: "correlate-git-state",
    from: "correlate",
    to: "git-state",
    kind: "repo_correlation",
  },
  {
    id: "git-state-diff-capture",
    from: "git-state",
    to: "diff-capture",
    kind: "repo_artifact",
  },
  {
    id: "diff-capture-file-changes",
    from: "diff-capture",
    to: "file-changes",
    kind: "repo_artifact",
  },
];

const gitAvailable = (git: GitInfo | null) =>
  Boolean(git?.head || git?.status || git?.diff || git?.diffStat);
const statusFromSeverity = (s: Severity): Status =>
  s === "failed"
    ? "failed"
    : s === "warning"
      ? "warning"
      : s === "skipped" || s === "unavailable"
        ? "skipped"
        : "completed";
const node = (
  id: string,
  title: string,
  severity: Severity,
  subtitle: string,
  icon: IconName,
  badgeLabel?: string,
): GraphNodeViewModel => ({
  id,
  title,
  severity,
  status: statusFromSeverity(severity),
  subtitle,
  icon,
  badgeLabel,
  badgeTone:
    severity === "minor-warning"
      ? "minor-warning"
      : severity === "unavailable" || severity === "skipped"
        ? "muted"
        : severity === "failed"
          ? "error"
          : severity === "warning"
            ? "warning"
            : "success",
  ...GRAPH_COORDS[id],
  detail: { title, summary: subtitle },
});

export function deriveGraphLinkStatus(input: {
  link: GraphLinkDefinition;
  nodesById: Map<string, GraphNodeViewModel>;
  replayStatus: ReplayStatusSummary;
  capturedRunStatus: CapturedRunStatusSummary;
  hasGitInfo: boolean;
  hasDiffInfo: boolean;
}): GraphLinkViewModel["status"] {
  const {
    link,
    nodesById,
    replayStatus,
    capturedRunStatus,
    hasGitInfo,
    hasDiffInfo,
  } = input;
  const to = nodesById.get(link.to);
  switch (link.kind) {
    case "recorder_pipeline":
      if (replayStatus.status === "parse_failed") return "failed";
      return to?.severity === "warning" || to?.severity === "minor-warning"
        ? "warning"
        : "completed";
    case "replay_output":
      if (["render_failed", "write_failed"].includes(replayStatus.status))
        return "failed";
      if (
        replayStatus.status === "generated_with_warnings" ||
        replayStatus.status === "partial"
      )
        return "warning";
      return "completed";
    case "recorder_to_captured":
      if (
        capturedRunStatus.status === "not_applicable" ||
        to?.severity === "unavailable"
      )
        return "pending";
      return to?.severity === "warning" || to?.severity === "minor-warning"
        ? "warning"
        : "completed";
    case "captured_execution":
      if (capturedRunStatus.failedCommands || capturedRunStatus.failedTests)
        return "failed";
      return capturedRunStatus.totalCommands || capturedRunStatus.totalTests
        ? "completed"
        : "pending";
    case "captured_artifact":
      return capturedRunStatus.fileEdits ? "completed" : "pending";
    case "repo_correlation":
      return hasGitInfo ? "completed" : "pending";
    case "repo_artifact":
      if (!hasGitInfo) return "pending";
      return hasDiffInfo ? "completed" : "warning";
  }
}

export function deriveExecutionGraph(
  input: GraphDerivationInput,
): ExecutionGraphViewModel {
  const { session, git } = input;
  const events = session.events;
  const warnings = [
    ...session.warnings,
    ...events.flatMap((e) => e.warnings ?? []),
  ];
  const unknown = events.filter((e) => e.type === "unknown").length;
  const known = events.length - unknown;
  const hasGit = gitAvailable(git);
  const diffOk = Boolean(
    git?.diff || git?.diffStat || events.some((e) => e.diff),
  );
  const replayStatus =
    input.replayStatus ??
    deriveReplayStatus({
      events,
      warnings,
      unknownEventsCount: unknown,
      outputWritten: input.outputWritten,
      htmlValidated: input.htmlValid,
    });
  const captured = input.capturedRunStatus ?? deriveCapturedRunStatus(events);
  const parseSeverity: Severity =
    replayStatus.status === "parse_failed"
      ? "failed"
      : warnings.length === 0
        ? "none"
        : warnings.length <= 2
          ? "minor-warning"
          : "warning";
  const agentSeverity: Severity =
    captured.status === "not_applicable"
      ? "skipped"
      : events.length === 0
        ? "unavailable"
        : unknown > known
          ? "warning"
          : unknown > 0
            ? "minor-warning"
            : "none";
  const commandSeverity: Severity =
    captured.status === "not_applicable"
      ? "skipped"
      : captured.failedCommands || captured.failedTests
        ? "failed"
        : captured.totalCommands || captured.totalTests
          ? "none"
          : "unavailable";
  const fileSeverity: Severity =
    captured.status === "not_applicable" && diffOk
      ? "none"
      : captured.status === "not_applicable"
        ? "unavailable"
        : captured.fileEdits
          ? "none"
          : "unavailable";
  const outputSeverity: Severity = ["render_failed", "write_failed"].includes(
    replayStatus.status,
  )
    ? "failed"
    : replayStatus.status === "generated_with_warnings" ||
        replayStatus.status === "partial"
      ? "minor-warning"
      : "none";
  const nodes = [
    node(
      "discover",
      "Discover",
      session.path || session.sessionPath || session.provider
        ? "none"
        : "failed",
      session.sessionPath ? "session found" : "source context",
      "discover",
    ),
    node(
      "parse",
      "Parse",
      parseSeverity,
      warnings.length
        ? `Parsed with ${warnings.length} warnings`
        : `${events.length} events`,
      "parse",
      parseSeverity === "minor-warning" ? "partial" : undefined,
    ),
    node(
      "normalize",
      "Normalize",
      events.length ? "none" : "failed",
      events.length ? "normalized events" : "empty timeline",
      "normalize",
    ),
    node(
      "agent-events",
      "Agent Events",
      agentSeverity,
      captured.status === "not_applicable"
        ? "Git-only replay"
        : unknown
          ? `${events.length} events, ${unknown} unknown`
          : `${events.length} events captured`,
      "terminal",
      captured.status === "not_applicable"
        ? "N/A"
        : agentSeverity === "minor-warning"
          ? "partial"
          : undefined,
    ),
    node(
      "commands",
      "Commands / Tools",
      commandSeverity,
      captured.status === "not_applicable"
        ? "Not captured"
        : captured.failedTests
          ? `${captured.failedTests} failed tests`
          : captured.failedCommands
            ? `${captured.failedCommands} failed commands`
            : captured.totalCommands || captured.totalTests
              ? "commands passed"
              : "no command data",
      "terminal",
      captured.status === "not_applicable"
        ? "N/A"
        : commandSeverity === "failed"
          ? "FAILED"
          : commandSeverity === "unavailable"
            ? "N/A"
            : undefined,
    ),
    node(
      "file-changes",
      "File Changes",
      fileSeverity,
      captured.status === "not_applicable"
        ? "From commits"
        : captured.fileEdits
          ? `${captured.fileEdits} edits captured`
          : "none captured",
      "edit",
      fileSeverity === "unavailable" ? "N/A" : undefined,
    ),
    node(
      "correlate",
      "Correlate",
      hasGit ? "none" : "unavailable",
      hasGit ? "repo metadata" : "not a git repo",
      "correlate",
      hasGit ? undefined : "not captured",
    ),
    node(
      "git-state",
      "Git State",
      hasGit ? "none" : "unavailable",
      git?.head ? git.head.slice(0, 12) : "not a git repo",
      "branch",
      hasGit ? undefined : "not captured",
    ),
    node(
      "diff-capture",
      "Diff Capture",
      diffOk ? "none" : hasGit ? "minor-warning" : "unavailable",
      diffOk ? "diff available" : "no git diff captured",
      "edit",
      diffOk ? undefined : "not captured",
    ),
    node(
      "replay-output",
      "Replay Output",
      outputSeverity,
      replayStatus.status === "generated"
        ? "HTML written"
        : replayStatus.reason,
      "flag",
      outputSeverity === "failed"
        ? "FAILED"
        : outputSeverity === "minor-warning"
          ? "WARNING"
          : "COMPLETE",
    ),
  ];
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const links = GRAPH_LINKS.map((link) => ({
    ...link,
    status: deriveGraphLinkStatus({
      link,
      nodesById,
      replayStatus,
      capturedRunStatus: captured,
      hasGitInfo: hasGit,
      hasDiffInfo: diffOk,
    }),
  }));
  return {
    nodes,
    links,
    laneLabels: ["Recorder Pipeline", "Captured Run", "Repository"],
    legend: [
      { label: "Completed", status: "completed" },
      { label: "Minor", status: "completed" },
      { label: "Warning", status: "warning" },
      { label: "Failed", status: "failed" },
      { label: "Skipped", status: "skipped" },
    ],
  } as ExecutionGraphViewModel;
}
