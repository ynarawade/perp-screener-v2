import type { MarkPriceData } from "./types.js";

const marketData = new Map<string, MarkPriceData>();

export function updateMarketData(data: MarkPriceData) {
  marketData.set(data.symbol, data);
}

export function getMarketData(symbol: string) {
  return marketData.get(symbol);
}

export function getAllMarketData() {
  return Array.from(marketData.values());
}
