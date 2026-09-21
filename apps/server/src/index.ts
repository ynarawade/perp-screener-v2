import { buildApp } from "./app.js";
import { getPerpetualSymbols } from "./binance/symbols.js";
import { config } from "./config.js";
import { bootstrapKlines } from "./market/kline-bootstrap.js";
import { subscribeToKlines } from "./market/kline-stream.js";
import { subscribeToLiquidations } from "./market/liquidation.js";
import { startOpenInterestPoller } from "./market/oi.js";
import { MarketDataService } from "./market/service.js";
import { ScreenerService } from "./scoring/service.js";

const screenerService = new ScreenerService();
const app = buildApp(screenerService);
const marketDataService = new MarketDataService();

let shuttingDown = false;
let stopOpenInterest: (() => void) | undefined;
let kline1hHandle: { close: () => void } | undefined;
let kline4hHandle: { close: () => void } | undefined;
let liquidationHandle: { close: () => void } | undefined;

const shutdown = async () => {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log("Shutting down...");

  try {
    screenerService.stop();

    kline1hHandle?.close();
    kline4hHandle?.close();
    liquidationHandle?.close();

    await marketDataService.stop();
    stopOpenInterest?.();

    await app.close();

    console.log("Shutdown complete");
  } catch (error) {
    app.log.error(error, "Error during shutdown");
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

const perpetualSymbols = await getPerpetualSymbols();

const symbols = perpetualSymbols
  .map((symbol) => symbol.symbol)
  .filter((symbol): symbol is string => symbol !== undefined);

console.log(`Found ${symbols.length} perpetual symbols`);

await bootstrapKlines(symbols);

console.log("Kline bootstrap completed");

console.log("Starting 1H kline streams...");

kline1hHandle = await subscribeToKlines(symbols, "1h");

console.log("1H kline streams started");

console.log("Starting 4H kline streams...");

kline4hHandle = await subscribeToKlines(symbols, "4h");

console.log("4H kline streams started");

await marketDataService.start(symbols);

console.log("Market data service started");

console.log("Starting Open Interest poller...");

stopOpenInterest = await startOpenInterestPoller(symbols);

liquidationHandle = await subscribeToLiquidations(symbols);

console.log("Open Interest poller started");

screenerService.start();

console.log("Screener service started");

try {
  await app.listen({
    port: config.port,
    host: "0.0.0.0",
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
