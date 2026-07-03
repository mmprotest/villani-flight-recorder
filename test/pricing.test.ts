import { describe, expect, it } from "vitest";
import { estimateCost, matchModelRates } from "../src/render/pricing.js";
import { FlightEvent, TokenUsage } from "../src/providers/types.js";

let n = 0;
const ev = (
  model: string | undefined,
  tokenUsage?: TokenUsage,
): FlightEvent => ({
  id: `e${++n}`,
  provider: "claude",
  type: "assistant_message",
  title: "t",
  model,
  tokenUsage,
});

const MILLION = 1_000_000;
const onePerClass: TokenUsage = {
  inputTokens: MILLION,
  outputTokens: MILLION,
  cacheCreationTokens: MILLION,
  cacheReadTokens: MILLION,
};

describe("pricing", () => {
  it("matches model ids by longest known prefix, tolerating date suffixes", () => {
    expect(matchModelRates("claude-haiku-4-5-20251001")?.key).toBe(
      "claude-haiku-4-5",
    );
    expect(matchModelRates("claude-opus-4-5-20250929")?.key).toBe(
      "claude-opus-4-5",
    );
    expect(matchModelRates("claude-fable-5")?.key).toBe("claude-fable-5");
    expect(matchModelRates("claude-sonnet-5-20260210")?.key).toBe(
      "claude-sonnet-5",
    );
  });

  it("refuses to match unknown, synthetic, or non-boundary model ids", () => {
    expect(matchModelRates("<synthetic>")).toBeUndefined();
    expect(matchModelRates("gpt-5")).toBeUndefined();
    expect(matchModelRates("claude-opus-4-51")).toBeUndefined();
    expect(matchModelRates("claude-next-1")).toBeUndefined();
  });

  it("applies the exact list rates per token class", () => {
    const cases: [string, number][] = [
      ["claude-fable-5", 10 + 50 + 12.5 + 1.0],
      ["claude-opus-4-8", 5 + 25 + 6.25 + 0.5],
      ["claude-opus-4-7", 5 + 25 + 6.25 + 0.5],
      ["claude-opus-4-6", 5 + 25 + 6.25 + 0.5],
      ["claude-opus-4-5", 5 + 25 + 6.25 + 0.5],
      ["claude-sonnet-5", 2 + 10 + 2.5 + 0.2],
      ["claude-sonnet-4-6", 3 + 15 + 3.75 + 0.3],
      ["claude-sonnet-4-5", 3 + 15 + 3.75 + 0.3],
      ["claude-haiku-4-5", 1 + 5 + 1.25 + 0.1],
    ];
    for (const [model, usd] of cases) {
      const est = estimateCost([ev(model, onePerClass)]);
      expect(est.totalUsd, model).toBeCloseTo(usd, 6);
      expect(est.perModel).toHaveLength(1);
      expect(est.perModel[0].model).toBe(model);
      expect(est.unknownModels).toEqual([]);
      expect(est.hasUsageWithoutModel).toBe(false);
    }
  });

  it("sums mixed-model usage per model and in total", () => {
    const est = estimateCost([
      ev("claude-sonnet-4-5-20250929", { inputTokens: 2 * MILLION }),
      ev("claude-sonnet-4-5-20250929", { outputTokens: MILLION }),
      ev("claude-haiku-4-5-20251001", {
        inputTokens: MILLION,
        cacheReadTokens: 10 * MILLION,
      }),
      ev("claude-fable-5"), // no usage: contributes nothing
    ]);
    const sonnet = est.perModel.find((m) => m.model === "claude-sonnet-4-5");
    const haiku = est.perModel.find((m) => m.model === "claude-haiku-4-5");
    expect(est.perModel).toHaveLength(2);
    expect(sonnet?.tokens.inputTokens).toBe(2 * MILLION);
    expect(sonnet?.tokens.outputTokens).toBe(MILLION);
    expect(sonnet?.usd).toBeCloseTo(2 * 3 + 15, 6);
    expect(haiku?.usd).toBeCloseTo(1 + 10 * 0.1, 6);
    expect(est.totalUsd).toBeCloseTo(23, 6);
    expect(est.unknownModels).toEqual([]);
    expect(est.hasUsageWithoutModel).toBe(false);
  });

  it("tracks unknown models separately and never guesses their cost", () => {
    const est = estimateCost([
      ev("<synthetic>", { inputTokens: 5 * MILLION }),
      ev("mystery-model-9", { outputTokens: MILLION }),
      ev("claude-haiku-4-5", { inputTokens: MILLION }),
    ]);
    expect(est.totalUsd).toBeCloseTo(1, 6);
    expect([...est.unknownModels].sort()).toEqual([
      "<synthetic>",
      "mystery-model-9",
    ]);
  });

  it("flags token usage that carries no model", () => {
    const est = estimateCost([ev(undefined, { inputTokens: MILLION })]);
    expect(est.perModel).toHaveLength(0);
    expect(est.totalUsd).toBe(0);
    expect(est.hasUsageWithoutModel).toBe(true);
  });
});
