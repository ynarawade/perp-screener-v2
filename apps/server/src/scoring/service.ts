import { getMarketSnapshots } from "../market/snapshot.js";

import { scoreAllMarkets } from "./scorer.js";
import type { ScreenerApiResult, ScreenerResult } from "./types.js";

import type { MarketSnapshot } from "../market/snapshot.js";

const EVALUATION_INTERVAL_MS = 1_000;

export class ScreenerService {
  private timer: NodeJS.Timeout | null = null;

  private results: ScreenerResult[] = [];

  private latestMarkets = new Map<string, MarketSnapshot>();

  evaluate() {
    const markets = getMarketSnapshots();

    this.latestMarkets = new Map(
      markets.map((market) => [market.symbol, market])
    );

    this.results = scoreAllMarkets(markets);

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
