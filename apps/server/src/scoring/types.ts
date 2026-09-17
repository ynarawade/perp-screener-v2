import type { LiquidationSample } from "../market/types.js";
import type { StrategyDirection } from "../strategies/types.js";

export type ScoreComponent = {
  name: string;
  score: number;
  reason: string;
};

export type ScreenerResult = {
  symbol: string;
  direction: StrategyDirection;
  score: number;
  components: ScoreComponent[];
  strategyIds: string[];
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
