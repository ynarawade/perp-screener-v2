import type { StrategyDefinition } from "./types.js";

/**
 * Strategy Registry
 *
 * This is the central list of strategies currently available
 * to the new Stage 3 strategy engine.
 *
 * Later we will replace / extend this with database-backed
 * Strategy CRUD, but for now keeping strategies in code makes
 * testing much safer.
 */
export const strategyRegistry: StrategyDefinition[] = [
  /**
   * ----------------------------------------------------------
   * STRATEGY 1
   * Multi-Timeframe EMA Long Alignment
   * ----------------------------------------------------------
   *
   * LONG when:
   *
   * EMA 9 > EMA 21 on 1H
   * AND
   * EMA 9 > EMA 21 on 4H
   */
  {
    id: "mtf-ema-long-alignment",

    name: "MTF EMA Long Alignment",

    description:
      "Bullish alignment when EMA 9 is above EMA 21 on both 1H and 4H.",

    direction: "LONG",

    enabled: true,

    tags: ["EMA", "TREND", "MULTI_TIMEFRAME", "LONG"],

    condition: {
      type: "ALL",

      conditions: [
        {
          type: "FEATURE_FEATURE",

          left: "ema.1h.9",

          operator: "GT",

          right: "ema.1h.21",
        },

        {
          type: "FEATURE_FEATURE",

          left: "ema.4h.9",

          operator: "GT",

          right: "ema.4h.21",
        },
      ],
    },
  },

  /**
   * ----------------------------------------------------------
   * STRATEGY 2
   * Multi-Timeframe EMA Short Alignment
   * ----------------------------------------------------------
   *
   * SHORT when:
   *
   * EMA 9 < EMA 21 on 1H
   * AND
   * EMA 9 < EMA 21 on 4H
   */
  {
    id: "mtf-ema-short-alignment",

    name: "MTF EMA Short Alignment",

    description:
      "Bearish alignment when EMA 9 is below EMA 21 on both 1H and 4H.",

    direction: "SHORT",

    enabled: true,

    tags: ["EMA", "TREND", "MULTI_TIMEFRAME", "SHORT"],

    condition: {
      type: "ALL",

      conditions: [
        {
          type: "FEATURE_FEATURE",

          left: "ema.1h.9",

          operator: "LT",

          right: "ema.1h.21",
        },

        {
          type: "FEATURE_FEATURE",

          left: "ema.4h.9",

          operator: "LT",

          right: "ema.4h.21",
        },
      ],
    },
  },

  /**
   * ----------------------------------------------------------
   * STRATEGY 3
   * Negative Funding Bullish Trend
   * ----------------------------------------------------------
   *
   * LONG when:
   *
   * Funding < 0
   * AND
   * EMA 9 > EMA 21 on 1H
   * AND
   * EMA 9 > EMA 21 on 4H
   *
   * This is NOT yet your final Funding Strategy.
   * It is a useful baseline to verify that numeric feature-value
   * conditions and EMA conditions work together.
   */
  {
    id: "negative-funding-bullish-trend",

    name: "Negative Funding + Bullish Trend",

    description:
      "Long setup when funding is negative while 1H and 4H EMA trend remains bullish.",

    direction: "LONG",

    enabled: true,

    tags: ["FUNDING", "EMA", "TREND", "LONG"],

    condition: {
      type: "ALL",

      conditions: [
        {
          type: "FEATURE_VALUE",

          feature: "funding.rate",

          operator: "LT",

          value: 0,
        },

        {
          type: "FEATURE_FEATURE",

          left: "ema.1h.9",

          operator: "GT",

          right: "ema.1h.21",
        },

        {
          type: "FEATURE_FEATURE",

          left: "ema.4h.9",

          operator: "GT",

          right: "ema.4h.21",
        },
      ],
    },
  },

  /**
   * ----------------------------------------------------------
   * STRATEGY 4
   * Positive Funding Bearish Trend
   * ----------------------------------------------------------
   *
   * SHORT when:
   *
   * Funding > 0
   * AND
   * EMA 9 < EMA 21 on 1H
   * AND
   * EMA 9 < EMA 21 on 4H
   */
  {
    id: "positive-funding-bearish-trend",

    name: "Positive Funding + Bearish Trend",

    description:
      "Short setup when funding is positive while 1H and 4H EMA trend remains bearish.",

    direction: "SHORT",

    enabled: true,

    tags: ["FUNDING", "EMA", "TREND", "SHORT"],

    condition: {
      type: "ALL",

      conditions: [
        {
          type: "FEATURE_VALUE",

          feature: "funding.rate",

          operator: "GT",

          value: 0,
        },

        {
          type: "FEATURE_FEATURE",

          left: "ema.1h.9",

          operator: "LT",

          right: "ema.1h.21",
        },

        {
          type: "FEATURE_FEATURE",

          left: "ema.4h.9",

          operator: "LT",

          right: "ema.4h.21",
        },
      ],
    },
  },
];

/**
 * Return all strategies.
 */
export function getStrategies(): StrategyDefinition[] {
  return strategyRegistry;
}

/**
 * Return only enabled strategies.
 */
export function getEnabledStrategies(): StrategyDefinition[] {
  return strategyRegistry.filter((strategy) => strategy.enabled);
}

/**
 * Find one strategy by ID.
 */
export function getStrategyById(
  strategyId: string
): StrategyDefinition | undefined {
  return strategyRegistry.find((strategy) => strategy.id === strategyId);
}
