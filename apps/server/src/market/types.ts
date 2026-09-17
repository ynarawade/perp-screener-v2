import type { AppKlineInterval } from "../binance/rest.js";

export interface OiSample {
  timestamp: number;
  openInterest: number;
}

export interface RealtimeMarketState {
  markPrice: number | null;
  fundingRate: number | null;
  nextFundingTime: number | null;

  priceUpdatedAt: number | null;
  fundingUpdatedAt: number | null;
}

export interface SymbolMarketState {
  symbol: string;

  realtime: RealtimeMarketState;

  klines: unknown[];
  klinesUpdatedAt: number | null;

  oiSamples: OiSample[];
  oiUpdatedAt: number | null;
}

export type MarkPriceData = {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  eventTime: number;
};

export type TickerData = {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  lastPrice: number;
  volume: number;
  quoteVolume: number;
  eventTime: number;
};

export type KlineData = {
  symbol: string;
  interval: AppKlineInterval;

  openTime: number;
  closeTime: number;

  open: number;
  high: number;
  low: number;
  close: number;

  volume: number;
  quoteVolume: number;

  closed: boolean;

  eventTime: number;
};

export type MarketData = MarkPriceData &
  TickerData & {
    liquidations: LiquidationSample[];
    openInterest: OpenInterestData | null;
    oiSamples: OiSample[];
    klines: {
      "1h": KlineData[];
      "4h": KlineData[];
    };
  };
export interface OiSample {
  timestamp: number;
  openInterest: number;
  price: number;
}

export type OpenInterestData = {
  symbol: string;
  openInterest: number;
  eventTime: number;
  price: number;
};

export type LiquidationData = {
  symbol: string;
  side: "LONG" | "SHORT";
  price: number;
  quantity: number;
  notional: number;
  eventTime: number;
};

export type LiquidationSample = {
  timestamp: number;
  longNotional: number;
  shortNotional: number;
};
