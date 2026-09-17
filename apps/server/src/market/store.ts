import type { AppKlineInterval } from "../binance/rest.js";
import type {
  KlineData,
  MarketData,
  MarkPriceData,
  OiSample,
  OpenInterestData,
  TickerData,
} from "./types.js";

const marketData = new Map<string, MarketData>();

function createBaseMarketData(symbol: string): MarketData {
  return {
    symbol,

    markPrice: 0,
    indexPrice: 0,
    fundingRate: 0,
    nextFundingTime: 0,
    eventTime: 0,

    priceChange: 0,
    priceChangePercent: 0,
    lastPrice: 0,
    volume: 0,
    quoteVolume: 0,
    openInterest: null,
    oiSamples: [],

    klines: {
      "1h": [],
      "4h": [],
    },
  };
}

function getOrCreate(symbol: string) {
  const existing = marketData.get(symbol);

  if (existing) {
    return existing;
  }

  const created = createBaseMarketData(symbol);
  marketData.set(symbol, created);

  return created;
}

export function updateMarkPrice(data: MarkPriceData) {
  const existing = getOrCreate(data.symbol);

  marketData.set(data.symbol, {
    ...existing,
    ...data,
  });
}

export function updateTicker(data: TickerData) {
  const existing = getOrCreate(data.symbol);

  marketData.set(data.symbol, {
    ...existing,
    ...data,
  });
}

export function updateKlines(
  symbol: string,
  interval: AppKlineInterval,
  klines: KlineData[]
) {
  const existing = getOrCreate(symbol);

  marketData.set(symbol, {
    ...existing,
    klines: {
      ...existing.klines,
      [interval]: klines,
    },
  });
}

export function updateKline(data: KlineData) {
  const existing = getOrCreate(data.symbol);

  const existingKlines = existing.klines[data.interval];

  const index = existingKlines.findIndex(
    (kline) => kline.openTime === data.openTime
  );

  let updatedKlines: KlineData[];

  if (index === -1) {
    updatedKlines = [...existingKlines, data];
  } else {
    updatedKlines = [...existingKlines];
    updatedKlines[index] = data;
  }

  updatedKlines = updatedKlines
    .sort((a, b) => a.openTime - b.openTime)
    .slice(-120);

  marketData.set(data.symbol, {
    ...existing,
    klines: {
      ...existing.klines,
      [data.interval]: updatedKlines,
    },
  });
}

export function getMarketData(symbol: string) {
  return marketData.get(symbol);
}

export function getAllMarketData() {
  return Array.from(marketData.values());
}

export function updateOpenInterest(data: OpenInterestData) {
  const existing = getOrCreate(data.symbol);

  const sample: OiSample = {
    timestamp: data.eventTime,
    openInterest: data.openInterest,
  };

  const samples = [...existing.oiSamples, sample];

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  const recentSamples = samples.filter((sample) => sample.timestamp >= cutoff);

  marketData.set(data.symbol, {
    ...existing,
    openInterest: data,
    oiSamples: recentSamples,
  });
}
