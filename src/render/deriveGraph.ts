import { GitInfo } from "../git/gitInfo.js";
import { FlightEvent, ParsedSession } from "../providers/types.js";
import { IconName } from "./components/icons.js";
import { GRAPH_COORDS } from "./graphGeometry.js";
import {
  ExecutionGraphViewModel,
  GraphLinkViewModel,
  GraphNodeViewModel,
  Severity,
  Status,
} from "./viewModel.js";

export interface GraphDerivationInput {
  session: ParsedSession;
  git: GitInfo | null;
  htmlValid?: boolean;
  outputWritten?: boolean;
}
const failed = (events: FlightEvent[]) =>
  events.some((e) => e.type === "error" || (e.exitCode ?? 0) !== 0);
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
  const hasFail = failed(events);
  const hasReview = events.some((e) =>
    /review/i.test(`${e.type} ${e.title} ${e.summary ?? ""}`),
  );
  const reviewFail = events.some(
    (e) =>
      /review/i.test(`${e.type} ${e.title}`) &&
      ((e.exitCode ?? 0) !== 0 || e.type === "error"),
  );
  const parseSeverity: Severity =
    events.length === 0
      ? "failed"
      : warnings.length === 0
        ? "none"
        : warnings.length <= 2
          ? "minor-warning"
          : "warning";
  const sessionSeverity: Severity =
    events.length === 0
      ? "failed"
      : unknown > known
        ? "warning"
        : unknown > 0
          ? "minor-warning"
          : "none";
  const validateSeverity: Severity = hasFail
    ? "failed"
    : warnings.length || unknown
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
      `${events.length} events`,
      "parse",
      parseSeverity === "minor-warning" ? "partial" : undefined,
    ),
    node(
      "normalize",
      "Normalize",
      events.length ? "none" : "failed",
      events.length ? "timeline events" : "empty timeline",
      "normalize",
    ),
    node(
      "correlate",
      "Correlate",
      hasGit ? "none" : "unavailable",
      hasGit ? "git metadata" : "not a git repo",
      "correlate",
      hasGit ? undefined : "not captured",
    ),
    node(
      "session-events",
      "Session Events",
      sessionSeverity,
      unknown ? `${unknown} unknown records` : `${events.length} known`,
      "terminal",
      sessionSeverity === "minor-warning" ? "partial" : undefined,
    ),
    node(
      "git-state",
      "Git State",
      hasGit ? "none" : "unavailable",
      git?.head ? git.head.slice(0, 12) : "not captured",
      "branch",
      hasGit ? undefined : "not captured",
    ),
    node(
      "diff-capture",
      "Diff Capture",
      diffOk ? "none" : hasGit ? "minor-warning" : "unavailable",
      diffOk ? "diff available" : hasGit ? "not captured" : "not a git repo",
      "edit",
      diffOk ? undefined : "not captured",
    ),
    node(
      "validate",
      "Validate",
      validateSeverity,
      hasFail
        ? "run failed"
        : validateSeverity === "minor-warning"
          ? "generated with notes"
          : "static HTML valid",
      "shield",
      validateSeverity === "minor-warning" ? "partial" : undefined,
    ),
    node(
      "review",
      "Review",
      hasReview ? (reviewFail ? "failed" : "none") : "skipped",
      hasReview ? "review captured" : "optional phase",
      "review",
      hasReview ? undefined : "skipped",
    ),
    node(
      "finalize",
      "Finalize",
      input.outputWritten === false ? "failed" : "none",
      "HTML written",
      "flag",
    ),
  ];
  const pairs = [
    "discover:parse",
    "parse:normalize",
    "normalize:correlate",
    "normalize:session-events",
    "session-events:git-state",
    "git-state:diff-capture",
    "diff-capture:validate",
    "validate:review",
    "review:finalize",
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
