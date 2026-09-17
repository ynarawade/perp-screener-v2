import { connectWebSocket } from "../binance/websocket.js";
import { subscribeToMarkPrice } from "./mark-price.js";
import { updateMarkPrice, updateTicker } from "./store.js";
import { subscribeTo24hTicker } from "./ticker.js";

export class MarketDataService {
  private connection?: Awaited<ReturnType<typeof connectWebSocket>>;

  async start(symbols: string[]) {
    this.connection = await connectWebSocket();

    const perpetualSymbols = new Set(symbols);

    subscribeToMarkPrice(this.connection, (data) => {
      updateMarkPrice(data);
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
