import { binance } from "./client.js";
type KlineRequest = Parameters<typeof binance.restAPI.klineCandlestickData>[0];

export async function getExchangeInformation() {
  const response = await binance.restAPI.exchangeInformation();
  return response.data();
}

export async function getKlines(
  symbol: string,
  interval: KlineRequest["interval"],

  limit = 100
) {
  const response = await binance.restAPI.klineCandlestickData({
    symbol,
    interval,

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
