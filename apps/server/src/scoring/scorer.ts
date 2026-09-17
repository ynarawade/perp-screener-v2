import type { MarketSnapshot } from "../market/snapshot.js";
import type { StrategyResult } from "../strategies/types.js";
import type { ScoreComponent, ScreenerResult } from "./types.js";

function calculateTrendScore(
  market: MarketSnapshot,
  direction: "LONG" | "SHORT"
): ScoreComponent {
  const candles1h = market.klines["1h"];
  const candles4h = market.klines["4h"];

  const current1h = candles1h.at(-1);
  const previous1h = candles1h.at(-2);

  const current4h = candles4h.at(-1);
  const previous4h = candles4h.at(-2);

  if (!current1h || !previous1h || !current4h || !previous4h) {
    return {
      name: "TREND",
      score: 0,
      reason: "Insufficient candle data",
    };
  }

  const change1h =
    previous1h.close === 0
      ? 0
      : (current1h.close - previous1h.close) / previous1h.close;

  const change4h =
    previous4h.close === 0
      ? 0
      : (current4h.close - previous4h.close) / previous4h.close;

  const multiplier = direction === "LONG" ? 1 : -1;

  const score = (change1h * 2 + change4h * 3) * multiplier * 100;

  return {
    name: "TREND",
    score: Math.max(-5, Math.min(5, score)),
    reason:
      direction === "LONG"
        ? `1H ${(change1h * 100).toFixed(2)}%, 4H ${(change4h * 100).toFixed(2)}%`
        : `1H ${(change1h * 100).toFixed(2)}%, 4H ${(change4h * 100).toFixed(2)}%`,
  };
}

function calculateFundingScore(
  market: MarketSnapshot,
  direction: "LONG" | "SHORT"
): ScoreComponent {
  const funding = market.fundingRate;

  let aligned = false;

  if (direction === "LONG") {
    aligned = funding < 0;
  } else {
    aligned = funding > 0;
  }

  return {
    name: "FUNDING",
    score: aligned ? 2 : -2,
    reason: `Funding rate: ${funding}`,
  };
}

function calculateOiScore(
  market: MarketSnapshot,
  direction: "LONG" | "SHORT"
): ScoreComponent {
  const previous = market.oiSamples.at(-2);
  const current = market.oiSamples.at(-1);

  if (
    !previous ||
    !current ||
    previous.openInterest <= 0 ||
    previous.price <= 0
  ) {
    return {
      name: "OPEN_INTEREST",
      score: 0,
      reason: "Insufficient OI data",
    };
  }

  const oiChange =
    (current.openInterest - previous.openInterest) / previous.openInterest;

  const priceChange = (current.price - previous.price) / previous.price;

  const oiIncreasing = oiChange > 0;
  const priceIncreasing = priceChange > 0;

  const aligned =
    direction === "LONG"
      ? priceIncreasing && oiIncreasing
      : !priceIncreasing && oiIncreasing;

  return {
    name: "OPEN_INTEREST",
    score: aligned ? 3 : 0,
    reason:
      `OI ${(oiChange * 100).toFixed(2)}%, ` +
      `Price ${(priceChange * 100).toFixed(2)}%`,
  };
}

function calculateLiquidationScore(
  market: MarketSnapshot,
  direction: "LONG" | "SHORT"
): ScoreComponent {
  const recent = market.liquidations.slice(-20);

  if (recent.length === 0) {
    return {
      name: "LIQUIDATIONS",
      score: 0,
      reason: "No liquidation data",
    };
  }

  const longLiquidations = recent.reduce(
    (sum, item) => sum + item.longNotional,
    0
  );

  const shortLiquidations = recent.reduce(
    (sum, item) => sum + item.shortNotional,
    0
  );

  const aligned =
    direction === "LONG" ? shortLiquidations > 0 : longLiquidations > 0;

  return {
    name: "LIQUIDATIONS",
    score: aligned ? 1 : 0,
    reason:
      `Long: ${longLiquidations.toFixed(2)}, ` +
      `Short: ${shortLiquidations.toFixed(2)}`,
  };
}

function calculateBasisScore(
  market: MarketSnapshot,
  direction: "LONG" | "SHORT"
): ScoreComponent {
  const basis = market.basis;

  const aligned = direction === "LONG" ? basis < 0 : basis > 0;

  return {
    name: "BASIS",
    score: aligned ? 1 : 0,
    reason: `Basis ${(basis * 100).toFixed(4)}%`,
  };
}

export function scoreMarket(
  market: MarketSnapshot,
  direction: "LONG" | "SHORT",
  strategyIds: string[] = []
): ScreenerResult {
  const components = [
    calculateTrendScore(market, direction),
    calculateFundingScore(market, direction),
    calculateOiScore(market, direction),
    calculateLiquidationScore(market, direction),
    calculateBasisScore(market, direction),
  ];

  const score = components.reduce(
    (total, component) => total + component.score,
    0
  );

  return {
    symbol: market.symbol,
    direction,
    score,
    components,
    strategyIds,
  };
}
export function scoreAllMarkets(
  markets: MarketSnapshot[],
  strategyResults: StrategyResult[]
): ScreenerResult[] {
  const results: ScreenerResult[] = [];

  for (const market of markets) {
    const marketStrategies = strategyResults.filter(
      (strategy) => strategy.symbol === market.symbol
    );

    for (const direction of ["LONG", "SHORT"] as const) {
      const matchingStrategies = marketStrategies.filter(
        (strategy) => strategy.direction === direction
      );

      if (matchingStrategies.length === 0) {
        continue;
      }

      const strategyIds = matchingStrategies.map(
        (strategy) => strategy.strategyId
      );

      results.push(scoreMarket(market, direction, strategyIds));
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
