import { binance } from "./client.js";

type KlineRequest = Parameters<typeof binance.restAPI.klineCandlestickData>[0];

export type AppKlineInterval = "1h" | "4h";

export async function getExchangeInformation() {
  const response = await binance.restAPI.exchangeInformation();
  return response.data();
}

export async function getKlines(
  symbol: string,
  interval: AppKlineInterval,
  limit = 100
) {
  const response = await binance.restAPI.klineCandlestickData({
    symbol,
    interval: interval as KlineRequest["interval"],
    limit,
  });

  return response.data();
}

export async function getOpenInterest(symbol: string) {
  const response = await binance.restAPI.openInterest({
    symbol,
  });

  return response.data();
}
