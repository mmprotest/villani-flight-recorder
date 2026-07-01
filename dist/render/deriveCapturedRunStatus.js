import { isTestCommand } from "../normalize/events.js";
const cmdTypes = new Set([
    "bash_command",
    "tool_call",
    "tool_result",
    "test_run",
]);
const editTypes = new Set(["file_edit", "file_write", "file_delete"]);
const hasErrorFlag = (raw) => Boolean(raw &&
    typeof raw === "object" &&
    "is_error" in raw &&
    raw.is_error === true);
const commandLike = (e) => Boolean(e.command) || cmdTypes.has(e.type) || failedLike(e);
const testLike = (e) => e.type === "test_run" || Boolean(e.command && isTestCommand(e.command));
const failedLike = (e) => (e.exitCode ?? 0) !== 0 ||
    (e.type === "error" &&
        /command|tool|test|tests failed|bash|shell/i.test(`${e.title} ${e.summary ?? ""} ${e.command ?? ""}`)) ||
    (e.type === "tool_result" && hasErrorFlag(e.raw));
export function deriveCapturedRunStatus(events) {
    const hasAgent = events.some((e) => !["git_commit", "git_status", "diff"].includes(e.type));
    const totalCommands = events.filter(commandLike).length;
    const totalTests = events.filter(testLike).length;
    const failedCommands = events.filter((e) => commandLike(e) && failedLike(e)).length;
    const failedTests = events.filter((e) => testLike(e) && failedLike(e)).length;
    const fileEdits = events.filter((e) => editTypes.has(e.type) ||
        /apply_patch/i.test(`${e.title} ${e.summary ?? ""}`)).length;
    const hasFinalAnswer = events.some((e) => e.type === "session_end" ||
        /final answer|complete|completed|summary/i.test(`${e.title} ${e.summary ?? ""}`));
    const unknown = events.filter((e) => e.type === "unknown").length;
    if (!hasAgent)
        return {
            status: "not_applicable",
            label: "N/A",
            tone: "muted",
            reason: "Git-only replay",
            failedCommands,
            failedTests,
            totalCommands,
            totalTests,
            fileEdits,
            hasFinalAnswer,
        };
    if (failedCommands || failedTests)
        return {
            status: "failed",
            label: "Failed",
            tone: "error",
            reason: failedTests
                ? `${failedTests} failed tests`
                : `${failedCommands} failed commands`,
            failedCommands,
            failedTests,
            totalCommands,
            totalTests,
            fileEdits,
            hasFinalAnswer,
        };
    if (!totalCommands && !totalTests && !hasFinalAnswer && fileEdits === 0)
        return {
            status: "unknown",
            label: "Unknown",
            tone: "muted",
            reason: "No command results captured",
            failedCommands,
            failedTests,
            totalCommands,
            totalTests,
            fileEdits,
            hasFinalAnswer,
        };
    if (!hasFinalAnswer && unknown > Math.max(1, events.length / 3))
        return {
            status: "partial",
            label: "Partial",
            tone: "warning",
            reason: `${unknown} unknown events`,
            failedCommands,
            failedTests,
            totalCommands,
            totalTests,
            fileEdits,
            hasFinalAnswer,
        };
    return {
        status: "succeeded",
        label: "Succeeded",
        tone: "success",
        reason: totalCommands || totalTests
            ? "Captured commands passed"
            : "Completion captured",
        failedCommands,
        failedTests,
        totalCommands,
        totalTests,
        fileEdits,
        hasFinalAnswer,
    };
}
