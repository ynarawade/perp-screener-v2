import type { MarketSnapshot } from "../market/snapshot.js";
import type { Strategy, StrategyResult, StrategySignal } from "./types.js";

export const trendFollowingStrategy: Strategy = {
  id: "trend-following",
  name: "Trend Following",
  direction: "LONG",

  evaluate(market: MarketSnapshot): StrategyResult | null {
    const candles1h = market.klines["1h"];
    const candles4h = market.klines["4h"];

    if (candles1h.length < 5 || candles4h.length < 5) {
      return null;
    }

    const signals: StrategySignal[] = [];
    let score = 0;

    const current1h = candles1h[candles1h.length - 1]!;

    const previous1h = candles1h[candles1h.length - 2]!;

    const current4h = candles4h[candles4h.length - 1]!;

    const previous4h = candles4h[candles4h.length - 2]!;

    // 1H momentum
    const momentum1h = (current1h.close - previous1h.close) / previous1h.close;

    if (momentum1h > 0) {
      score += 2;

      signals.push({
        name: "1H_MOMENTUM",
        value: momentum1h,
        description: "1H price momentum is positive",
      });
    }

    // 4H trend
    const momentum4h = (current4h.close - previous4h.close) / previous4h.close;

    if (momentum4h > 0) {
      score += 3;

      signals.push({
        name: "4H_TREND",
        value: momentum4h,
        description: "4H trend is positive",
      });
    }

    // Funding
    if (market.fundingRate < 0) {
      score += 1;
      signals.push({
        name: "NEGATIVE_FUNDING",
        value: market.fundingRate,
        description: "Funding rate is negative",
      });
    }

    // OI
    const oiSamples = market.oiSamples;

    if (oiSamples.length >= 2) {
      const previousOI = oiSamples[oiSamples.length - 2]!.openInterest;

      const currentOI = oiSamples[oiSamples.length - 1]!.openInterest;

      if (previousOI > 0) {
        const oiChange = (currentOI - previousOI) / previousOI;

        if (oiChange > 0) {
          score += 2;

          signals.push({
            name: "OI_INCREASE",
            value: oiChange,
            description: "Open interest is increasing",
          });
        }
      }
    }

    if (score === 0) {
      return null;
    }

    return {
      strategyId: this.id,
      strategyName: this.name,

      symbol: market.symbol,
      direction: this.direction,

      score,
      signals,
    };
  },
};
