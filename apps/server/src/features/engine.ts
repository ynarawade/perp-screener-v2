import type { MarketSnapshot } from "../market/snapshot.js";
import type { Feature, FeatureSnapshot } from "./types.js";

function valid(value: number): Feature {
  return { value, validity: "VALID" };
}

function warmingUp(): Feature {
  return { value: null, validity: "WARMING_UP" };
}

function missing(): Feature {
  return { value: null, validity: "MISSING" };
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

function buildEmaFeatures(
  market: MarketSnapshot,
  interval: "1h" | "4h"
): { ema9: Feature; ema21: Feature } {
  const closes = market.klines[interval]
    .filter((candle) => candle.closed)
    .map((candle) => candle.close);

  const ema9 = calculateEma(closes, 9);
  const ema21 = calculateEma(closes, 21);

  return {
    ema9: ema9 === null ? warmingUp() : valid(ema9),
    ema21: ema21 === null ? warmingUp() : valid(ema21),
  };
}

function buildOiFeatures(market: MarketSnapshot): {
  deltaRatio: Feature;
  priceDeltaRatio: Feature;
} {
  const previous = market.oiSamples.at(-2);
  const current = market.oiSamples.at(-1);

  if (
    !previous ||
    !current ||
    previous.openInterest <= 0 ||
    previous.price <= 0
  ) {
    return { deltaRatio: warmingUp(), priceDeltaRatio: warmingUp() };
  }

  const deltaRatio =
    (current.openInterest - previous.openInterest) / previous.openInterest;

  const priceDeltaRatio = (current.price - previous.price) / previous.price;

  return {
    deltaRatio: valid(deltaRatio),
    priceDeltaRatio: valid(priceDeltaRatio),
  };
}

function buildVolumeFeature(market: MarketSnapshot): Feature {
  const candles = market.klines["1h"].filter((candle) => candle.closed);
  const current = candles.at(-1);

  if (!current || candles.length < 21) {
    return warmingUp();
  }

  const previousVolumes = candles.slice(-21, -1).map((candle) => candle.volume);

  const averageVolume =
    previousVolumes.reduce((sum, volume) => sum + volume, 0) /
    previousVolumes.length;

  if (averageVolume <= 0) {
    return missing();
  }

  return valid(current.volume / averageVolume);
}

function buildLiquidationFeatures(market: MarketSnapshot): {
  longNotional: Feature;
  shortNotional: Feature;
} {
  const candles1h = market.klines["1h"].filter((candle) => candle.closed);
  const currentCandle = candles1h.at(-1);

  if (!currentCandle) {
    return { longNotional: warmingUp(), shortNotional: warmingUp() };
  }

  const windowed = market.liquidations.filter(
    (sample) =>
      sample.timestamp >= currentCandle.openTime &&
      sample.timestamp <= currentCandle.closeTime
  );

  const longNotional = windowed.reduce(
    (sum, item) => sum + item.longNotional,
    0
  );
  const shortNotional = windowed.reduce(
    (sum, item) => sum + item.shortNotional,
    0
  );

  return {
    longNotional: valid(longNotional),
    shortNotional: valid(shortNotional),
  };
}

export function buildFeatureSnapshot(market: MarketSnapshot): FeatureSnapshot {
  const ema1h = buildEmaFeatures(market, "1h");
  const ema4h = buildEmaFeatures(market, "4h");
  const oi = buildOiFeatures(market);
  const liquidations = buildLiquidationFeatures(market);

  return {
    symbol: market.symbol,
    computedAt: Date.now(),

    "ema.1h.9": ema1h.ema9,
    "ema.1h.21": ema1h.ema21,
    "ema.4h.9": ema4h.ema9,
    "ema.4h.21": ema4h.ema21,

    "funding.rate": valid(market.fundingRate),

    "oi.delta_ratio": oi.deltaRatio,
    "oi.price_delta_ratio": oi.priceDeltaRatio,

    "volume.closed_1h_ratio_20": buildVolumeFeature(market),

    "basis.mark_index_ratio": valid(market.basis),

    "liquidations.long_notional_1h": liquidations.longNotional,
    "liquidations.short_notional_1h": liquidations.shortNotional,
  };
}
