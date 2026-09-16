import { connectWebSocket } from "../binance/websocket.js";
import type { MarkPriceData } from "./types.js";

export async function subscribeToMarkPrice(
  onUpdate: (data: MarkPriceData) => void
) {
  const connection = await connectWebSocket();

  const stream = connection.markPriceStreamForAllMarket();

  stream.on("message", (message) => {
    if (!message) {
      return;
    }

    for (const item of message) {
      if (!item) {
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
