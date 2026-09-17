import type { MarketSnapshot } from "../market/snapshot.js";
import type {
  Direction,
  ScoreComponent,
  ScreenerResult,
  Signal,
} from "./types.js";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getSignal(score: number): Signal {
  if (score >= 85) return "STRONG_BUY";
  if (score >= 70) return "BUY";
  if (score >= 40) return "WATCH";
  if (score >= 15) return "SELL";

  return "STRONG_SELL";
}
function getDirection(score: number): Direction {
  if (score >= 60) return "BULLISH";
  if (score < 40) return "BEARISH";

  return "NEUTRAL";
}
function calculateEma(values: number[], period: number): number | null {
  if (values.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);

  let ema =
    values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  for (const value of values.slice(period)) {
    ema = (value - ema) * multiplier + ema;
  }

  return ema;
}
function calculateEmaSeparation(ema9: number, ema21: number): number {
  if (ema21 === 0) {
    return 0;
  }

  return (ema9 - ema21) / ema21;
}

function calculateTrendScore(market: MarketSnapshot): ScoreComponent {
  const candles1h = market.klines["1h"];
  const candles4h = market.klines["4h"];

  const closes1h = candles1h
    .filter((candle) => candle.closed)
    .map((candle) => candle.close);

  const closes4h = candles4h
    .filter((candle) => candle.closed)
    .map((candle) => candle.close);

  const ema9_1h = calculateEma(closes1h, 9);
  const ema21_1h = calculateEma(closes1h, 21);

  const ema9_4h = calculateEma(closes4h, 9);
  const ema21_4h = calculateEma(closes4h, 21);

  if (
    ema9_1h === null ||
    ema21_1h === null ||
    ema9_4h === null ||
    ema21_4h === null
  ) {
    return {
      name: "TREND",
      score: 15,
      maxScore: 30,
      reason: "Insufficient EMA data",
    };
  }

  const separation1h = calculateEmaSeparation(ema9_1h, ema21_1h);

  const separation4h = calculateEmaSeparation(ema9_4h, ema21_4h);

  /*
   * +/-1% EMA separation represents the maximum
   * bullish/bearish trend strength for each timeframe.
   */
  const normalized1h = clamp(separation1h / 0.01, -1, 1);

  const normalized4h = clamp(separation4h / 0.01, -1, 1);

  /*
   * 1H = 40%
   * 4H = 60%
   */
  const trendStrength = normalized1h * 0.4 + normalized4h * 0.6;

  /*
   * Convert -1..+1 into 0..30.
   *
   * -1  → 0
   *  0  → 15
   * +1  → 30
   */
  const score = ((trendStrength + 1) / 2) * 30;

  return {
    name: "TREND",
    score: clamp(score, 0, 30),
    maxScore: 30,
    reason:
      `1H separation ${(separation1h * 100).toFixed(3)}%, ` +
      `4H separation ${(separation4h * 100).toFixed(3)}%`,
  };
}

function calculateVolumeScore(market: MarketSnapshot): ScoreComponent {
  const candles = market.klines["1h"].filter((candle) => candle.closed);

  const current = candles.at(-1);

  if (!current || candles.length < 21) {
    return {
      name: "VOLUME",
      score: 7.5,
      maxScore: 15,
      reason: "Insufficient volume data",
    };
  }

  const previousVolumes = candles.slice(-21, -1).map((candle) => candle.volume);

  const averageVolume =
    previousVolumes.reduce((sum, volume) => sum + volume, 0) /
    previousVolumes.length;

  if (averageVolume <= 0) {
    return {
      name: "VOLUME",
      score: 7.5,
      maxScore: 15,
      reason: "Invalid volume data",
    };
  }

  const volumeRatio = current.volume / averageVolume;

  const priceChange =
    current.open === 0 ? 0 : (current.close - current.open) / current.open;

  /*
   * Volume surge:
   *
   * 1.0x = normal volume
   * 2.0x = strong surge
   *
   * Below normal volume should not create
   * a directional signal.
   */
  const surgeStrength = clamp((volumeRatio - 1) / 1, 0, 1);

  let score = 7.5;

  if (surgeStrength > 0) {
    if (priceChange > 0) {
      score = 7.5 + surgeStrength * 7.5;
    } else if (priceChange < 0) {
      score = 7.5 - surgeStrength * 7.5;
    }
  }

  return {
    name: "VOLUME",
    score: clamp(score, 0, 15),
    maxScore: 15,
    reason:
      `Volume ${volumeRatio.toFixed(2)}x average, ` +
      `Price ${(priceChange * 100).toFixed(2)}%`,
  };
}

function calculateFundingScore(market: MarketSnapshot): ScoreComponent {
  const funding = market.fundingRate;

  const normalized = clamp(0.5 - funding / 0.0002, 0, 1);

  return {
    name: "FUNDING",
    score: normalized * 15,
    maxScore: 15,
    reason: `Funding ${(funding * 100).toFixed(4)}%`,
  };
}

function calculateOiScore(market: MarketSnapshot): ScoreComponent {
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
      score: 10,
      maxScore: 20,
      reason: "Insufficient OI data",
    };
  }

  const oiChange =
    (current.openInterest - previous.openInterest) / previous.openInterest;

  const priceChange = (current.price - previous.price) / previous.price;

  /*
   * Positive = bullish pressure
   * Negative = bearish pressure
   */
  let directionalStrength = 0;

  if (priceChange > 0 && oiChange > 0) {
    // New longs entering
    directionalStrength = Math.min(
      Math.abs(priceChange) + Math.abs(oiChange),
      0.02
    );
  } else if (priceChange < 0 && oiChange > 0) {
    // New shorts entering
    directionalStrength = -Math.min(
      Math.abs(priceChange) + Math.abs(oiChange),
      0.02
    );
  } else if (priceChange > 0 && oiChange < 0) {
    // Short covering
    directionalStrength = Math.min(Math.abs(priceChange), 0.02);
  } else if (priceChange < 0 && oiChange < 0) {
    // Long liquidation
    directionalStrength = -Math.min(Math.abs(priceChange), 0.02);
  }

  const normalized = clamp(directionalStrength / 0.02, -1, 1);

  const score = ((normalized + 1) / 2) * 20;

  return {
    name: "OPEN_INTEREST",
    score,
    maxScore: 20,
    reason:
      `OI ${(oiChange * 100).toFixed(2)}%, ` +
      `Price ${(priceChange * 100).toFixed(2)}%`,
  };
}

function calculateLiquidationScore(market: MarketSnapshot): ScoreComponent {
  const recent = market.liquidations.slice(-20);

  if (recent.length === 0) {
    return {
      name: "LIQUIDATIONS",
      score: 5,
      maxScore: 10,
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

  const totalLiquidations = longLiquidations + shortLiquidations;

  if (totalLiquidations <= 0) {
    return {
      name: "LIQUIDATIONS",
      score: 5,
      maxScore: 10,
      reason: "No liquidation notional",
    };
  }

  /*
   * Short liquidations support bullish movement.
   * Long liquidations support bearish movement.
   */
  const directionalRatio =
    (shortLiquidations - longLiquidations) / totalLiquidations;

  /*
   * Measure liquidation intensity relative to
   * the current 1H trading volume.
   */
  const intensity =
    market.quoteVolume > 0 ? totalLiquidations / market.quoteVolume : 0;

  const intensityMultiplier = clamp(intensity / 0.01, 0, 1);

  const directionalStrength = directionalRatio * intensityMultiplier;

  const normalized = clamp(0.5 + directionalStrength * 0.5, 0, 1);

  return {
    name: "LIQUIDATIONS",
    score: normalized * 10,
    maxScore: 10,
    reason:
      `Long: ${longLiquidations.toFixed(2)}, ` +
      `Short: ${shortLiquidations.toFixed(2)}, ` +
      `Intensity: ${(intensity * 100).toFixed(3)}%`,
  };
}

function calculateBasisScore(market: MarketSnapshot): ScoreComponent {
  const basis = market.basis;

  const normalized = clamp(0.5 - basis / 0.002, 0, 1);

  return {
    name: "BASIS",
    score: normalized * 10,
    maxScore: 10,
    reason: `Basis ${(basis * 100).toFixed(4)}%`,
  };
}
export function scoreMarket(market: MarketSnapshot): ScreenerResult {
  const components = [
    calculateTrendScore(market),
    calculateFundingScore(market),
    calculateOiScore(market),
    calculateLiquidationScore(market),
    calculateBasisScore(market),
    calculateVolumeScore(market),
  ];

  const rawScore = clamp(
    components.reduce((total, component) => total + component.score, 0),
    0,
    100
  );

  const score = Number(rawScore.toFixed(2));

  return {
    symbol: market.symbol,
    score,
    signal: getSignal(score),
    direction: getDirection(score),

    components,
  };
}

export function scoreAllMarkets(markets: MarketSnapshot[]): ScreenerResult[] {
  return markets
    .map((market) => scoreMarket(market))
    .sort((a, b) => b.score - a.score);
}
