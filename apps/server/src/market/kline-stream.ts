import { subscribeToBatchedStreams } from "../binance/combines-stream.js";
import type { AppKlineInterval } from "../binance/rest.js";
import { updateKline } from "./store.js";

type KlineInterval = "1h" | "4h";

type CombinedKlineMessage = {
  stream: string;
  data: {
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

export async function subscribeToKlines(
  symbols: string[],
  interval: KlineInterval
) {
  return subscribeToBatchedStreams({
    symbols,
    label: `klines-${interval}`,
    streamName: (symbol) => `${symbol.toLowerCase()}@kline_${interval}`,
    onMessage: (raw) => {
      const message = raw as CombinedKlineMessage;
      const kline = message.data?.k;

      if (!kline) return;

      updateKline({
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
      });
    },
  });
}
