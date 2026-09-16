export interface OiSample {
  timestamp: number;
  openInterest: number;
}

export interface RealtimeMarketState {
  markPrice: number | null;
  fundingRate: number | null;
  nextFundingTime: number | null;

  priceUpdatedAt: number | null;
  fundingUpdatedAt: number | null;
}

export interface SymbolMarketState {
  symbol: string;

  realtime: RealtimeMarketState;

  klines: unknown[];
  klinesUpdatedAt: number | null;

  oiSamples: OiSample[];
  oiUpdatedAt: number | null;
}

export type MarkPriceData = {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  eventTime: number;
};
