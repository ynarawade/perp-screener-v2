import { getKlines, type AppKlineInterval } from "../binance/rest.js";
import { updateKlines } from "./store.js";
import type { KlineData } from "./types.js";

const INTERVALS: AppKlineInterval[] = ["1h", "4h"];

const KLINE_LIMIT = 100;

function normalizeKline(
  symbol: string,
  interval: AppKlineInterval,
  kline: any
): KlineData {
  return {
    symbol,
    interval,

    openTime: Number(kline.openTime),
    closeTime: Number(kline.closeTime),

    open: Number(kline.open),
    high: Number(kline.high),
    low: Number(kline.low),
    close: Number(kline.close),

    volume: Number(kline.volume),
    quoteVolume: Number(kline.quoteVolume),

    closed: true,
    eventTime: Date.now(),
  };
}

async function bootstrapInterval(symbol: string, interval: AppKlineInterval) {
  const response = await getKlines(symbol, interval, KLINE_LIMIT);

  const klines = response.map((kline: any) =>
    normalizeKline(symbol, interval, kline)
  );

  updateKlines(symbol, interval, klines);
}

const CONCURRENCY = 20;

export async function bootstrapKlines(symbols: string[]) {
  const tasks: (() => Promise<void>)[] = [];

  for (const symbol of symbols) {
    for (const interval of INTERVALS) {
      tasks.push(async () => {
        try {
          await bootstrapInterval(symbol, interval);
        } catch (error) {
          console.error(
            `[kline-bootstrap] ${symbol} ${interval} failed:`,
            error
          );
        }
      });
    }
  }

  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map((task) => task()));

    console.log(
      `[kline-bootstrap] ${Math.min(
        i + CONCURRENCY,
        tasks.length
      )}/${tasks.length}`
    );
  }
}
