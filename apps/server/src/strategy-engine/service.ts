import { buildFeatureSnapshot } from "../features/engine.js";
import { getMarketSnapshots } from "../market/snapshot.js";

import type { FeatureSnapshot } from "../features/types.js";
import type { MarketSnapshot } from "../market/snapshot.js";

import { evaluateStrategy } from "./evaluator.js";
import { getEnabledStrategies, getStrategies } from "./registry.js";

import type { StrategyDefinition, StrategyEvaluationResult } from "./types.js";

const EVALUATION_POLL_MS = 1_000;

/**
 * We currently evaluate Stage 3 strategies once for every
 * newly CLOSED 1H candle.
 *
 * The service itself polls every second so it notices the new
 * candle quickly, but it will NOT evaluate the same closed
 * candle repeatedly.
 */
function getLatestClosed1hCloseTime(market: MarketSnapshot): number | null {
  const latestClosedCandle = market.klines["1h"]
    .filter((candle) => candle.closed)
    .at(-1);

  return latestClosedCandle?.closeTime ?? null;
}

/**
 * New Stage 3 Strategy Evaluation Service
 *
 * Pipeline:
 *
 * MarketSnapshot
 *      ↓
 * FeatureSnapshot
 *      ↓
 * Enabled Strategies
 *      ↓
 * evaluateStrategy()
 *      ↓
 * MATCH / NO_MATCH / NOT_READY
 *
 *
 * IMPORTANT:
 *
 * This service is completely independent from:
 *
 * - existing scorer.ts
 * - existing BUY / SELL / WATCH screener
 * - Binance trade execution
 *
 * No API key is required.
 */
export class StrategyEngineService {
  private timer: NodeJS.Timeout | null = null;

  /**
   * Used to prevent evaluating the same closed 1H candle
   * over and over.
   *
   * symbol -> latest evaluated 1H closeTime
   */
  private readonly lastEvaluatedCandle = new Map<string, number>();

  /**
   * Previous FeatureSnapshot for every symbol.
   *
   * This is required for:
   *
   * CROSSES_ABOVE
   * CROSSES_BELOW
   *
   * Example:
   *
   * previous EMA9 <= EMA21
   * current  EMA9 >  EMA21
   *
   * => real crossover
   */
  private readonly previousSnapshots = new Map<string, FeatureSnapshot>();

  /**
   * Latest strategy evaluation results.
   *
   * symbol -> strategy results
   */
  private readonly latestResults = new Map<
    string,
    StrategyEvaluationResult[]
  >();

  /**
   * Evaluate all enabled strategies for one market.
   */
  private evaluateMarket(
    market: MarketSnapshot,
    updatePreviousSnapshot = true
  ): StrategyEvaluationResult[] {
    const currentSnapshot = buildFeatureSnapshot(market);

    const previousSnapshot = this.previousSnapshots.get(market.symbol);

    const strategies = getEnabledStrategies();

    const results = strategies.map((strategy) =>
      evaluateStrategy(strategy, currentSnapshot, previousSnapshot)
    );

    if (updatePreviousSnapshot) {
      this.previousSnapshots.set(market.symbol, currentSnapshot);
    }

    return results;
  }

  /**
   * Evaluate every market that has received a NEW closed
   * 1H candle since the previous evaluation.
   */
  evaluateClosedCandles(): StrategyEvaluationResult[] {
    const markets = getMarketSnapshots();

    const newlyEvaluatedResults: StrategyEvaluationResult[] = [];

    for (const market of markets) {
      const latestCloseTime = getLatestClosed1hCloseTime(market);

      /**
       * Symbol has not warmed up enough yet.
       */
      if (latestCloseTime === null) {
        continue;
      }

      const previousCloseTime = this.lastEvaluatedCandle.get(market.symbol);

      /**
       * Already evaluated this exact closed candle.
       *
       * Skip it.
       */
      if (previousCloseTime === latestCloseTime) {
        continue;
      }

      const results = this.evaluateMarket(market);

      this.latestResults.set(market.symbol, results);

      this.lastEvaluatedCandle.set(market.symbol, latestCloseTime);

      newlyEvaluatedResults.push(...results);
    }

    return newlyEvaluatedResults;
  }

  /**
   * Force evaluation of every currently available market.
   *
   * Useful later for:
   *
   * - manual API testing
   * - development
   * - diagnostics
   *
   * This ignores the closed-candle deduplication check.
   *
   * Do NOT use this for automatic production polling.
   */
  evaluateAllNow(): StrategyEvaluationResult[] {
    const markets = getMarketSnapshots();

    const allResults: StrategyEvaluationResult[] = [];

    for (const market of markets) {
      const results = this.evaluateMarket(market, false);

      allResults.push(...results);
    }

    return allResults;
  }

  /**
   * Return every registered strategy.
   *
   * Includes disabled strategies.
   */
  listStrategies(): StrategyDefinition[] {
    return getStrategies();
  }

  /**
   * Return all latest evaluation results.
   */
  getResults(): StrategyEvaluationResult[] {
    return Array.from(this.latestResults.values()).flat();
  }

  /**
   * Return only strategies that currently MATCH.
   */
  getMatches(): StrategyEvaluationResult[] {
    return this.getResults().filter((result) => result.status === "MATCH");
  }

  /**
   * Return latest results for one symbol.
   *
   * Example:
   *
   * BTCUSDT
   */
  getResultsForSymbol(symbol: string): StrategyEvaluationResult[] {
    return this.latestResults.get(symbol.toUpperCase()) ?? [];
  }

  /**
   * Return only MATCH results for one symbol.
   */
  getMatchesForSymbol(symbol: string): StrategyEvaluationResult[] {
    return this.getResultsForSymbol(symbol).filter(
      (result) => result.status === "MATCH"
    );
  }

  /**
   * Simple service statistics.
   *
   * Useful for API health/debugging later.
   */
  getStats() {
    const results = this.getResults();

    const matches = results.filter(
      (result) => result.status === "MATCH"
    ).length;

    const noMatches = results.filter(
      (result) => result.status === "NO_MATCH"
    ).length;

    const notReady = results.filter(
      (result) => result.status === "NOT_READY"
    ).length;

    return {
      registeredStrategies: getStrategies().length,

      enabledStrategies: getEnabledStrategies().length,

      evaluatedSymbols: this.latestResults.size,

      totalResults: results.length,

      matches,

      noMatches,

      notReady,

      running: this.timer !== null,
    };
  }

  /**
   * Start automatic Stage 3 evaluation.
   */
  start(): void {
    if (this.timer) {
      return;
    }

    console.log(
      `[strategy-engine] Starting evaluation poll every ${
        EVALUATION_POLL_MS / 1000
      }s`
    );

    /**
     * Run once immediately.
     */
    this.evaluateClosedCandles();

    this.timer = setInterval(
      () => {
        try {
          const results = this.evaluateClosedCandles();

          const matches = results.filter((result) => result.status === "MATCH");

          /**
           * Only log when a NEW candle produced
           * strategy matches.
           */
          if (matches.length > 0) {
            console.log(
              `[strategy-engine] ${matches.length} strategy match(es)`
            );
          }
        } catch (error) {
          console.error("[strategy-engine] Evaluation failed:", error);
        }
      },

      EVALUATION_POLL_MS
    );
  }

  /**
   * Stop automatic strategy evaluation.
   */
  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);

    this.timer = null;

    console.log("[strategy-engine] Strategy evaluation stopped");
  }
}
