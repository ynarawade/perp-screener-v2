import type { AppKlineInterval } from "../binance/rest.js";
import { connectWebSocket } from "../binance/websocket.js";
import { updateKline } from "./store.js";

import type { KlineData } from "./types.js";

type KlineIntervalConfig = "1h" | "4h";

const SUBSCRIBE_DELAY_MS = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function subscribeToKlines(
  symbols: string[],
  interval: KlineIntervalConfig
) {
  const connection = await connectWebSocket();
  type KlineStreamRequest = Parameters<
    typeof connection.klineCandlestickStreams
  >[0];

  for (const symbol of symbols) {
    const stream = connection.klineCandlestickStreams({
      symbol,
      interval: interval as KlineStreamRequest["interval"],
    });

    stream.on("message", (message) => {
      if (!message) {
        return;
      }

      const kline = message.k;

      if (!kline) {
        return;
      }

      const data: KlineData = {
        symbol: kline.s!,
        interval: kline.i as AppKlineInterval,

        openTime: Number(kline.t),
        closeTime: Number(kline.T),

        open: Number(kline.o),
        high: Number(kline.h),
        low: Number(kline.l),
        close: Number(kline.c),

        volume: Number(kline.v),
        quoteVolume: Number(kline.q),

        closed: Boolean(kline.x),
        eventTime: Number(message.E),
      };

      updateKline(data);
    });

    await sleep(SUBSCRIBE_DELAY_MS);
  }

  return connection;
}
