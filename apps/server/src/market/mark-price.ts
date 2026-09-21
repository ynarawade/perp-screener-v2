import type { connectWebSocket } from "../binance/websocket.js";
import type { MarkPriceData } from "./types.js";

type WebsocketConnection = Awaited<ReturnType<typeof connectWebSocket>>;

export async function subscribeToMarkPrice(
  connection: WebsocketConnection,
  perpetualSymbols: Set<string>,
  onUpdate: (data: MarkPriceData) => void
) {
  const stream = connection.markPriceStreamForAllMarket();

  stream.on("message", (message) => {
    if (!message) {
      return;
    }

    for (const item of message) {
      if (!item) {
        continue;
      }

      // Match subscribeTo24hTicker's behavior — ignore symbols
      // outside our discovered USDT perpetual universe.
      if (!perpetualSymbols.has(item.s!)) {
        continue;
      }

      onUpdate({
        symbol: item.s!,
        markPrice: Number(item.p),
        indexPrice: Number(item.i),
        fundingRate: Number(item.r),
        nextFundingTime: Number(item.T),
        eventTime: Number(item.E),
      });
    }
  });

  return connection;
}
