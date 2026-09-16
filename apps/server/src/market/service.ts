import type { RuleEngine } from "../rules/engine.js";
import { emitRuleTriggered } from "../rules/event.js";
import { subscribeToMarkPrice } from "./mark-price.js";
import { updateMarketData } from "./store.js";

export class MarketDataService {
  private connection?: Awaited<ReturnType<typeof subscribeToMarkPrice>>;
  constructor(private ruleEngine: RuleEngine) {}

  async start() {
    this.connection = await subscribeToMarkPrice((data) => {
      updateMarketData(data);
      const results = this.ruleEngine.process(data);

      for (const result of results) {
        emitRuleTriggered(result);
      }
    });
  }

  async stop() {
    if (!this.connection) {
      return;
    }

    await this.connection.disconnect();
  }
}
