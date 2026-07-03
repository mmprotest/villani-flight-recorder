/**
 * List pricing in USD per million tokens, keyed by model-id prefix. Captured
 * model IDs may carry date suffixes (e.g. claude-haiku-4-5-20251001), so
 * lookup matches by longest known prefix at a "-" boundary. Unknown models
 * (including "<synthetic>") are never priced.
 */
export const MODEL_RATES = {
    "claude-fable-5": { input: 10, output: 50, cacheWrite: 12.5, cacheRead: 1.0 },
    "claude-opus-4-8": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
    "claude-opus-4-7": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
    "claude-opus-4-6": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
    "claude-opus-4-5": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
    // Introductory pricing in effect through 2026-08-31. Sticker pricing is
    // input 3 / output 15 / cacheWrite 3.75 / cacheRead 0.3.
    "claude-sonnet-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
    "claude-sonnet-4-6": {
        input: 3,
        output: 15,
        cacheWrite: 3.75,
        cacheRead: 0.3,
    },
    "claude-sonnet-4-5": {
        input: 3,
        output: 15,
        cacheWrite: 3.75,
        cacheRead: 0.3,
    },
    "claude-haiku-4-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};
/**
 * Longest-prefix match of a captured model ID against the pricing table.
 * A prefix only matches at a "-" boundary or an exact match, so e.g.
 * "claude-opus-4-51" does not match "claude-opus-4-5".
 */
export function matchModelRates(modelId) {
    let best;
    for (const [key, rates] of Object.entries(MODEL_RATES)) {
        const boundary = modelId.length === key.length || modelId[key.length] === "-";
        if (modelId.startsWith(key) && boundary)
            if (!best || key.length > best.key.length)
                best = { key, rates };
    }
    return best;
}
/**
 * Estimate USD cost of the token usage carried by events, from list pricing.
 * Usage on unknown models or without a model is tracked but never guessed.
 */
export function estimateCost(events) {
    const perModel = new Map();
    const unknownModels = new Set();
    let hasUsageWithoutModel = false;
    for (const e of events) {
        const u = e.tokenUsage;
        if (!u)
            continue;
        if (!e.model) {
            hasUsageWithoutModel = true;
            continue;
        }
        const match = matchModelRates(e.model);
        if (!match) {
            unknownModels.add(e.model);
            continue;
        }
        const cur = perModel.get(match.key) ?? {
            model: match.key,
            tokens: {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
            },
            usd: 0,
        };
        cur.tokens.inputTokens += u.inputTokens ?? 0;
        cur.tokens.outputTokens += u.outputTokens ?? 0;
        cur.tokens.cacheCreationTokens += u.cacheCreationTokens ?? 0;
        cur.tokens.cacheReadTokens += u.cacheReadTokens ?? 0;
        perModel.set(match.key, cur);
    }
    let totalUsd = 0;
    for (const m of perModel.values()) {
        const r = MODEL_RATES[m.model];
        m.usd =
            (m.tokens.inputTokens * r.input +
                m.tokens.outputTokens * r.output +
                m.tokens.cacheCreationTokens * r.cacheWrite +
                m.tokens.cacheReadTokens * r.cacheRead) /
                1_000_000;
        totalUsd += m.usd;
    }
    return {
        perModel: [...perModel.values()],
        totalUsd,
        unknownModels: [...unknownModels],
        hasUsageWithoutModel,
    };
}
/** "claude-sonnet-4-5" -> "sonnet-4-5" for compact display. */
export const shortModelName = (id) => id.replace(/^claude-/, "");
export function formatUsd(usd) {
    if (!Number.isFinite(usd))
        return "—";
    return usd > 0 && usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}
