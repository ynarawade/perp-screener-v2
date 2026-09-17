import { connectWebSocket } from "../binance/websocket.js";
import type { RuleEngine } from "../rules/engine.js";
import { emitRuleTriggered } from "../rules/event.js";
import { subscribeToMarkPrice } from "./mark-price.js";
import { updateMarkPrice, updateTicker } from "./store.js";
import { subscribeTo24hTicker } from "./ticker.js";

export class MarketDataService {
  private connection?: Awaited<ReturnType<typeof connectWebSocket>>;

  constructor(private ruleEngine: RuleEngine) {}

  async start(symbols: string[]) {
    this.connection = await connectWebSocket();
    const perpetualSymbols = new Set(symbols);

    subscribeToMarkPrice(this.connection, (data) => {
      updateMarkPrice(data);

      const results = this.ruleEngine.process(data);

      for (const result of results) {
        emitRuleTriggered(result);
      }
    });

    subscribeTo24hTicker(this.connection, perpetualSymbols, (data) => {
      updateTicker(data);
    });
  }

  async stop() {
    if (!this.connection) {
      return;
    }

    await this.connection.disconnect();
  }
}
