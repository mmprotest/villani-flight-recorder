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
const gitAvailable = (git: GitInfo | null) =>
  Boolean(git?.head || git?.status || git?.diff || git?.diffStat);
const statusFromSeverity = (s: Severity): Status =>
  s === "failed"
    ? "failed"
    : s === "warning"
      ? "warning"
      : s === "skipped"
        ? "skipped"
        : s === "unavailable"
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
const linkStatus = (
  a: GraphNodeViewModel,
  b: GraphNodeViewModel,
): GraphLinkViewModel["status"] =>
  a.status === "failed" || b.status === "failed"
    ? "failed"
    : a.severity === "warning" || b.severity === "warning"
      ? "warning"
      : a.status === "skipped" || b.status === "skipped"
        ? "pending"
        : "completed";
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
    captured.status === "not_applicable"
      ? "none"
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
      "correlate",
      "Correlate",
      hasGit ? "none" : "unavailable",
      hasGit ? "repo metadata" : "not a git repo",
      "correlate",
      hasGit ? undefined : "not captured",
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
      diffOk
        ? "diff available"
        : hasGit
          ? "no git diff captured"
          : "no git diff captured",
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
  const pairs = [
    "discover:parse",
    "parse:normalize",
    "normalize:correlate",
    "normalize:agent-events",
    "agent-events:commands",
    "commands:file-changes",
    "commands:git-state",
    "git-state:diff-capture",
    "diff-capture:replay-output",
  ];
  const links = pairs.map((s, i) => {
    const [from, to] = s.split(":");
    const a = nodes.find((n) => n.id === from)!;
    const b = nodes.find((n) => n.id === to)!;
    return { id: `l${i}`, from, to, status: linkStatus(a, b) };
  });
  return {
    nodes,
    links,
    legend: [
      { label: "Completed", status: "completed" },
      { label: "Minor", status: "completed" },
      { label: "Warning", status: "warning" },
      { label: "Failed", status: "failed" },
      { label: "Skipped", status: "skipped" },
    ],
  };
}
