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
  direction: StrategyDirection;
  score: number;
  components: ScoreComponent[];
  strategyIds: string[];
  market: ScreenerMarketData;
};

export type ScreenerResponse = {
  data: ScreenerResult[];
};
