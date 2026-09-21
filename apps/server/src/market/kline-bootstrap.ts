import { getKlines, type AppKlineInterval } from "../binance/rest.js";
import { updateKlines } from "./store.js";
import type { KlineData } from "./types.js";

const INTERVALS: AppKlineInterval[] = ["1h", "4h"];
type RawKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];
const KLINE_LIMIT = 100;

function normalizeKline(
  symbol: string,
  interval: AppKlineInterval,
  kline: RawKline
): KlineData {
  const closeTime = kline[6];

  return {
    symbol,
    interval,

    openTime: kline[0],
    closeTime,

    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),

    volume: Number(kline[5]),
    quoteVolume: Number(kline[7]),

    // Was hardcoded `true` ,the last candle in a REST klines
    // response is often still forming. Derive from closeTime instead.
    closed: Date.now() >= closeTime,
    eventTime: Date.now(),
  };
}

async function bootstrapInterval(symbol: string, interval: AppKlineInterval) {
  const response = await getKlines(symbol, interval, KLINE_LIMIT);

  const klines = response.map((kline) =>
    normalizeKline(symbol, interval, kline as RawKline)
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
