import type { MarketSnapshot } from "../market/snapshot.js";
import type { Strategy, StrategyResult } from "./types.js";

export class StrategyEngine {
  private strategies = new Map<string, Strategy>();

  addStrategy(strategy: Strategy) {
    this.strategies.set(strategy.id, strategy);
  }

  removeStrategy(strategyId: string) {
    this.strategies.delete(strategyId);
  }

  evaluate(market: MarketSnapshot): StrategyResult[] {
    const results: StrategyResult[] = [];

    for (const strategy of this.strategies.values()) {
      const result = strategy.evaluate(market);

      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  evaluateAll(markets: MarketSnapshot[]): StrategyResult[] {
    return markets.flatMap((market) => this.evaluate(market));
  }
}
