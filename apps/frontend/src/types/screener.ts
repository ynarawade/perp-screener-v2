export type StrategyDirection = "LONG" | "SHORT";

export type ScoreComponent = {
  name: string;
  score: number;
  reason: string;
};

export type LiquidationSample = {
  timestamp: number;
  longNotional: number;
  shortNotional: number;
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

export type ScreenerResult = {
  symbol: string;
  score: number;
  signal: Signal;
  direction: Direction;
  components: ScoreComponent[];
  market: ScreenerMarketData;
};

export type ScreenerResponse = {
  data: ScreenerResult[];
};

export type Signal = "STRONG_BUY" | "BUY" | "WATCH" | "SELL" | "STRONG_SELL";

export type Direction = "BULLISH" | "BEARISH" | "NEUTRAL";
