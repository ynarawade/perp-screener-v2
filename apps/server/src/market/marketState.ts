// import { marketConfig } from "./config.js";
// import type { OiSample, SymbolMarketState } from "./types.js";

// const states = new Map<string, SymbolMarketState>();

// for (const symbol of marketConfig.symbols) {
//   states.set(symbol, {
//     symbol,

//     realtime: {
//       markPrice: null,
//       fundingRate: null,
//       nextFundingTime: null,
//       priceUpdatedAt: null,
//       fundingUpdatedAt: null,
//     },

//     klines: [],
//     klinesUpdatedAt: null,

//     oiSamples: [],
//     oiUpdatedAt: null,
//   });
// }

// export function getMarketState(symbol: string): SymbolMarketState {
//   const state = states.get(symbol);

//   if (!state) {
//     throw new Error(`Unknown symbol: ${symbol}`);
//   }

//   return state;
// }

// export function getAllMarketStates(): SymbolMarketState[] {
//   return [...states.values()];
// }

// export function updatePrice(
//   symbol: string,
//   markPrice: number,
//   timestamp = Date.now()
// ) {
//   const state = getMarketState(symbol);

//   state.realtime.markPrice = markPrice;
//   state.realtime.priceUpdatedAt = timestamp;
// }

// export function updateFunding(
//   symbol: string,
//   fundingRate: number,
//   nextFundingTime: number,
//   timestamp = Date.now()
// ) {
//   const state = getMarketState(symbol);

//   state.realtime.fundingRate = fundingRate;
//   state.realtime.nextFundingTime = nextFundingTime;
//   state.realtime.fundingUpdatedAt = timestamp;
// }

// export function updateKlines(
//   symbol: string,
//   klines: unknown[],
//   timestamp = Date.now()
// ) {
//   const state = getMarketState(symbol);

//   state.klines = klines.slice(-marketConfig.klineLimit);
//   state.klinesUpdatedAt = timestamp;
// }

// export function addOiSample(
//   symbol: string,
//   openInterest: number,
//   timestamp: number
// ) {
//   const state = getMarketState(symbol);

//   const sample: OiSample = {
//     timestamp,
//     openInterest,
//   };

//   state.oiSamples.push(sample);

//   const maxSamples = marketConfig.oiLookbackSamples * 4;

//   if (state.oiSamples.length > maxSamples) {
//     state.oiSamples = state.oiSamples.slice(-maxSamples);
//   }

//   state.oiUpdatedAt = timestamp;
// }
