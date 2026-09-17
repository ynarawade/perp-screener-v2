import { connectWebSocket } from "../binance/websocket.js";
import type { TickerData } from "./types.js";

type WebsocketConnection = Awaited<ReturnType<typeof connectWebSocket>>;

export function subscribeTo24hTicker(
  connection: WebsocketConnection,
  perpetualSymbols: Set<string>,
  onUpdate: (data: TickerData) => void
) {
  const stream = connection.allMarketTickersStreams({});

  stream.on("message", (message) => {
    if (!message || !Array.isArray(message)) {
      return;
    }

    for (const item of message) {
      if (!item) {
        continue;
      }

      // Ignore symbols that aren't our USDT perpetuals
      if (!perpetualSymbols.has(item.s!)) {
        continue;
      }

      onUpdate({
        symbol: item.s!,
        priceChange: Number(item.p),
        priceChangePercent: Number(item.P),
        lastPrice: Number(item.c),
        volume: Number(item.v),
        quoteVolume: Number(item.q),
        eventTime: Number(item.E),
      });
    }
  });

  return stream;
}
