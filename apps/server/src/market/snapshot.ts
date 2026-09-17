import { getAllMarketData } from "./store.js";
import type { KlineData, LiquidationSample, OiSample } from "./types.js";

export type MarketSnapshot = {
  symbol: string;

  markPrice: number;
  indexPrice: number;
  fundingRate: number;

  lastPrice: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;

  basis: number;

  klines: {
    "1h": KlineData[];
    "4h": KlineData[];
  };

  openInterest: number | null;
  oiSamples: OiSample[];

  liquidations: LiquidationSample[];
};

export function getMarketSnapshots(): MarketSnapshot[] {
  return getAllMarketData().map((market) => {
    const basis =
      market.indexPrice === 0
        ? 0
        : (market.markPrice - market.indexPrice) / market.indexPrice;

    return {
      symbol: market.symbol,

      markPrice: market.markPrice,
      indexPrice: market.indexPrice,
      fundingRate: market.fundingRate,

      lastPrice: market.lastPrice,
      priceChangePercent: market.priceChangePercent,
      volume: market.volume,
      quoteVolume: market.quoteVolume,

      basis,

      klines: market.klines,

      openInterest: market.openInterest?.openInterest ?? null,

      oiSamples: market.oiSamples,

      liquidations: market.liquidations,
    };
  });
}
