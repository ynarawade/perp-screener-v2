import type { MarketSnapshot } from "../market/snapshot.js";

export type StrategyDirection = "LONG" | "SHORT";

export type StrategySignal = {
  name: string;
  value: number;
  description: string;
};

export type StrategyResult = {
  strategyId: string;
  strategyName: string;

  symbol: string;
  direction: StrategyDirection;

  score: number;

  signals: StrategySignal[];
};

export interface Strategy {
  id: string;
  name: string;
  direction: StrategyDirection;

  evaluate(market: MarketSnapshot): StrategyResult | null;
}
