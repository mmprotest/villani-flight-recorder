import { ParsedSession } from "../providers/types.js";
import {
  formatTokenCount,
  sumTokenUsage,
} from "../providers/helpers/tokens.js";
import { fmtDuration, fmtTime, MetricCardViewModel } from "./viewModel.js";
import { estimateCost, formatUsd, shortModelName } from "./pricing.js";
import {
  CapturedRunStatusSummary,
  ReplayStatusSummary,
} from "./statusTypes.js";
import { SubagentRollup } from "../index/subagents.js";

/**
 * Token/cost stats stored on the index SessionRecord at scan time. When
 * provided, these are the source of truth for the summary cards; the live
 * recompute from events is only a fallback for fields left undefined here.
 */
export type IndexSessionStats = {
  tokenCount?: number;
  inputTokenCount?: number;
  outputTokenCount?: number;
  cacheTokenCount?: number;
  reasoningTokenCount?: number;
  costUsd?: number;
  model?: string;
  subagents?: SubagentRollup;
};
const task = (s: ParsedSession) =>
  s.events.find((e) => e.type === "user_message")?.summary ??
  s.events.find((e) => e.type === "user_message")?.title ??
  (s.provider === "unknown" ? "Task unavailable" : "Task unavailable");
export const runnerLabel = (p: string) =>
  ({
    claude: "Claude Code",
    codex: "Codex",
    pi: "Pi",
    git: "Git Replay",
    unknown: "Generic replay",
  })[p] ??
  p ??
  "Generic replay";
export function deriveMetrics(
  session: ParsedSession,
  replayStatus: ReplayStatusSummary,
  capturedRunStatus: CapturedRunStatusSummary,
  indexStats?: IndexSessionStats,
): MetricCardViewModel[] {
  const indexTokens = indexStats?.tokenCount !== undefined;
  const tokenUsage = indexTokens ? undefined : sumTokenUsage(session.events);
  const cacheTokens =
    tokenUsage &&
    (tokenUsage.cacheCreationTokens !== undefined ||
      tokenUsage.cacheReadTokens !== undefined ||
      tokenUsage.cachedTokens !== undefined)
      ? (tokenUsage.cacheCreationTokens ?? 0) +
        (tokenUsage.cacheReadTokens ?? 0) +
        (tokenUsage.cachedTokens ?? 0)
      : undefined;
  const totalTokens = indexTokens
    ? indexStats!.tokenCount
    : tokenUsage?.totalTokens;
  const tokenParts = (
    indexTokens
      ? [
          indexStats!.inputTokenCount !== undefined
            ? `input ${formatTokenCount(indexStats!.inputTokenCount)}`
            : undefined,
          indexStats!.outputTokenCount !== undefined
            ? `output ${formatTokenCount(indexStats!.outputTokenCount)}`
            : undefined,
          indexStats!.cacheTokenCount !== undefined
            ? `cache ${formatTokenCount(indexStats!.cacheTokenCount)}`
            : undefined,
          indexStats!.reasoningTokenCount !== undefined
            ? `reasoning ${formatTokenCount(indexStats!.reasoningTokenCount)}`
            : undefined,
        ]
      : [
          tokenUsage?.inputTokens !== undefined
            ? `input ${formatTokenCount(tokenUsage.inputTokens)}`
            : undefined,
          tokenUsage?.outputTokens !== undefined
            ? `output ${formatTokenCount(tokenUsage.outputTokens)}`
            : undefined,
          cacheTokens !== undefined
            ? `cache ${formatTokenCount(cacheTokens)}`
            : undefined,
          tokenUsage?.reasoningTokens !== undefined
            ? `reasoning ${formatTokenCount(tokenUsage.reasoningTokens)}`
            : undefined,
        ]
  )
    .filter(Boolean)
    .join(" · ");
  const cost =
    indexStats?.costUsd !== undefined
      ? undefined
      : estimateCost(session.events);
  const costPartial =
    cost !== undefined &&
    (cost.unknownModels.length > 0 || cost.hasUsageWithoutModel);
  const costCard: MetricCardViewModel =
    indexStats?.costUsd !== undefined
      ? {
          id: "cost",
          label: "EST. COST (USD)",
          value: formatUsd(indexStats.costUsd),
          subvalue: "estimate from list pricing",
          icon: "cost",
        }
      : cost!.perModel.length > 0
        ? {
            id: "cost",
            label: "EST. COST (USD)",
            value: `${costPartial ? "≥ " : ""}${formatUsd(cost!.totalUsd)}`,
            subvalue: [
              cost!.perModel
                .map((m) => `${shortModelName(m.model)} ${formatUsd(m.usd)}`)
                .join(" · "),
              costPartial ? "partial — some usage not priceable" : undefined,
              "estimate from list pricing",
            ]
              .filter(Boolean)
              .join(" · "),
            icon: "cost",
          }
        : {
            id: "cost",
            label: "COST (USD)",
            value: "Not captured",
            subvalue: "No cost telemetry",
            icon: "cost",
            empty: true,
          };
  const subagents = indexStats?.subagents;
  const subagentCard: MetricCardViewModel | undefined =
    subagents && subagents.subagentCount > 0
      ? {
          id: "subagents",
          label: "SUBAGENT ROLL-UP",
          value: `incl. ${subagents.subagentCount} subagent${subagents.subagentCount === 1 ? "" : "s"}: ${formatTokenCount(subagents.tokenCount)} tokens / ${subagents.costUsd !== undefined ? formatUsd(subagents.costUsd) : "—"}`,
          subvalue: "session + subagent children combined",
          icon: "tokens",
        }
      : undefined;
  const dur =
    session.startedAt && session.endedAt
      ? fmtDuration(
          new Date(session.endedAt).getTime() -
            new Date(session.startedAt).getTime(),
        )
      : "Duration unavailable";
  const model = session.model ?? indexStats?.model;
  return [
    {
      id: "task",
      label: "TASK",
      value: task(session),
      subvalue: model ? `${session.provider} · ${model}` : session.provider,
      icon: "task",
    },
    {
      id: "model",
      label: "MODEL",
      value: model ?? "Provider format unknown",
      subvalue: model
        ? "Captured model metadata"
        : `${runnerLabel(session.provider)} session`,
      icon: "model",
      empty: !model,
    },
    {
      id: "runner",
      label: "RUNNER",
      value: runnerLabel(session.provider),
      empty: !session.provider,
      subvalue: `${session.events.length} events`,
      icon: "runner",
    },
    {
      id: "tokens",
      label: "TOKENS",
      value:
        totalTokens !== undefined
          ? formatTokenCount(totalTokens)
          : "Not captured",
      subvalue:
        totalTokens !== undefined
          ? tokenParts || "Token telemetry captured"
          : "No token telemetry",
      icon: "tokens",
      telemetryAvailable: totalTokens !== undefined,
      empty: totalTokens === undefined,
    },
    costCard,
    ...(subagentCard ? [subagentCard] : []),
    {
      id: "status",
      label: "STATUS",
      value: replayStatus.label,
      subvalue: `Captured: ${capturedRunStatus.label} — ${capturedRunStatus.reason}`,
      icon:
        replayStatus.tone === "error"
          ? "x"
          : replayStatus.tone === "warning"
            ? "warn"
            : "check",
      tone:
        replayStatus.tone === "error"
          ? "error"
          : replayStatus.tone === "warning"
            ? "warning"
            : replayStatus.tone === "success"
              ? "success"
              : "info",
    },
    {
      id: "duration",
      label: "DURATION",
      value: dur,
      subvalue: session.startedAt
        ? `Started ${fmtTime(session.startedAt)}`
        : "No duration captured",
      icon: "clock",
      empty: dur === "Duration unavailable",
    },
    {
      id: "runid",
      label: "RUN ID",
      value: session.sessionId ?? "Not captured",
      subvalue: session.sessionId ? "Session identifier" : "No runner metadata",
      icon: "run",
      empty: !session.sessionId,
    },
  ];
}
