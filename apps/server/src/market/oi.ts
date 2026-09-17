import { getOpenInterest } from "../binance/rest.js";
import { updateOpenInterest } from "./store.js";

const POLL_INTERVAL = 60_000;
const CONCURRENCY = 20;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSymbolOpenInterest(symbol: string) {
  try {
    const response = await getOpenInterest(symbol);

    updateOpenInterest({
      symbol: response.symbol!,
      openInterest: Number(response.openInterest),
      eventTime: Number(response.time),
    });
  } catch (error) {
    console.error(`[open-interest] ${symbol} failed:`, error);
  }
}

async function pollOpenInterest(symbols: string[]) {
  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map((symbol) => fetchSymbolOpenInterest(symbol)));
  }
}

export async function startOpenInterestPoller(symbols: string[]) {
  console.log("Fetching initial Open Interest...");

  await pollOpenInterest(symbols);

  console.log("Initial Open Interest completed");

  const timer = setInterval(() => {
    void pollOpenInterest(symbols);
  }, POLL_INTERVAL);

  return () => {
    clearInterval(timer);
  };
}
