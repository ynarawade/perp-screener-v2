import WebSocket from "ws";

import type { AppKlineInterval } from "../binance/rest.js";
import { updateKline } from "./store.js";
import type { KlineData } from "./types.js";

type KlineInterval = "1h" | "4h";

type CombinedKlineMessage = {
  stream: string;
  data: {
    e?: string;
    E?: number;
    k?: {
      t?: number;
      T?: number;
      s?: string;
      i?: string;
      o?: string;
      c?: string;
      h?: string;
      l?: string;
      v?: string;
      q?: string;
      x?: boolean;
    };
  };
};

const BINANCE_WS_URL = "wss://fstream.binance.com/stream";

export function subscribeToKlines(
  symbols: string[],
  interval: KlineInterval
): Promise<WebSocket> {
  const streams = symbols.map(
    (symbol) => `${symbol.toLowerCase()}@kline_${interval}`
  );

  const url = `${BINANCE_WS_URL}?streams=${streams.join("/")}`;

  console.log(`[klines] Connecting ${symbols.length} symbols - ${interval}`);

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);

    let connected = false;

    socket.on("open", () => {
      connected = true;

      console.log(`[klines] Connected ${symbols.length} symbols - ${interval}`);

      resolve(socket);
    });

    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as CombinedKlineMessage;

        const kline = message.data?.k;

        if (!kline) return;

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
          eventTime: Number(message.data.E),
        };

        updateKline(data);
      } catch (error) {
        console.error(`[klines] Failed to process ${interval} message:`, error);
      }
    });

    socket.on("error", (error) => {
      console.error(`[klines] ${interval} WebSocket error:`, error);

      if (!connected) {
        reject(error);
      }
    });

    socket.on("close", (code, reason) => {
      console.log(
        `[klines] ${interval} WebSocket closed`,
        code,
        reason.toString()
      );
    });
  });
}
