import type { LiquidationSample } from "../market/types.js";

export type Signal = "STRONG_BUY" | "BUY" | "WATCH" | "SELL" | "STRONG_SELL";

export type ScoreComponent = {
  name: string;
  score: number;
  maxScore: number;
  reason: string;
};

export type ScreenerResult = {
  symbol: string;
  score: number;
  signal: Signal;
  direction: Direction;
  components: ScoreComponent[];
};

export type ScreenerMarketData = {
  markPrice: number;
  indexPrice: number;
  lastPrice: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  fundingRate: number;
  openInterest: number | null;
  basis: number;
  liquidations: LiquidationSample[];
};

export type ScreenerApiResult = ScreenerResult & {
  market: ScreenerMarketData;
};
export type Direction = "BULLISH" | "BEARISH" | "NEUTRAL";
