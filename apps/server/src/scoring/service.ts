import { getMarketSnapshots } from "../market/snapshot.js";
import { StrategyEngine } from "../strategies/engine.js";
import { shortTrendStrategy } from "../strategies/short-trend.js";
import { trendFollowingStrategy } from "../strategies/trend-following.js";

import { scoreAllMarkets } from "./scorer.js";
import type { ScreenerApiResult, ScreenerResult } from "./types.js";

import type { MarketSnapshot } from "../market/snapshot.js";

const EVALUATION_INTERVAL_MS = 1_000;

export class ScreenerService {
  private timer: NodeJS.Timeout | null = null;

  private results: ScreenerResult[] = [];

  private latestMarkets = new Map<string, MarketSnapshot>();

  private readonly strategyEngine = new StrategyEngine();

  constructor() {
    this.strategyEngine.addStrategy(trendFollowingStrategy);
    this.strategyEngine.addStrategy(shortTrendStrategy);
  }

  evaluate() {
    const markets = getMarketSnapshots();

    this.latestMarkets = new Map(
      markets.map((market) => [market.symbol, market])
    );

    const strategyResults = this.strategyEngine.evaluateAll(markets);

    this.results = scoreAllMarkets(markets, strategyResults);

    return this.results;
  }

  getResults(): ScreenerApiResult[] {
    return this.results.map((result) => {
      const market = this.latestMarkets.get(result.symbol);

      return {
        ...result,
        market: {
          markPrice: market?.markPrice ?? 0,
          indexPrice: market?.indexPrice ?? 0,
          lastPrice: market?.lastPrice ?? 0,
          priceChangePercent: market?.priceChangePercent ?? 0,
          volume: market?.volume ?? 0,
          quoteVolume: market?.quoteVolume ?? 0,
          fundingRate: market?.fundingRate ?? 0,
          openInterest: market?.openInterest ?? null,
          basis: market?.basis ?? 0,
          liquidations: market?.liquidations ?? [],
        },
      };
    });
  }

  start() {
    if (this.timer) return;

    console.log(
      `[screener] Starting evaluation every ${EVALUATION_INTERVAL_MS / 1000}s`
    );

    this.evaluate();

    this.timer = setInterval(() => {
      this.evaluate();
    }, EVALUATION_INTERVAL_MS);
  }

  stop() {
    if (!this.timer) return;

    clearInterval(this.timer);
    this.timer = null;
  }
}
