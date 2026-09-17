import { buildApp } from "./app.js";
import { getPerpetualSymbols } from "./binance/symbols.js";
import { config } from "./config.js";
import { bootstrapKlines } from "./market/kline-bootstrap.js";
import { subscribeToKlines } from "./market/kline-stream.js";
import { subscribeToLiquidations } from "./market/liquidation.js";
import { startOpenInterestPoller } from "./market/oi.js";
import { MarketDataService } from "./market/service.js";
import { RuleEngine } from "./rules/engine.js";
import { ruleEvents } from "./rules/event.js";
import { ScreenerService } from "./scoring/service.js";

const screenerService = new ScreenerService();
const app = buildApp(screenerService);
const ruleEngine = new RuleEngine();

const STARTUP_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
ruleEngine.addRule({
  id: "funding-rate-high",
  name: "High Funding Rate",
  type: "FUNDING_RATE",
  condition: "GREATER_THAN",
  threshold: 0.00005,
});

ruleEngine.addRule({
  id: "funding-rate-low",
  name: "Low Funding Rate",
  type: "FUNDING_RATE",
  condition: "LESS_THAN",
  threshold: -0.00005,
});

const marketDataService = new MarketDataService(ruleEngine);

let shuttingDown = false;

const shutdown = async () => {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log("Shutting down...");

  try {
    await marketDataService.stop();
    stopOpenInterest();

    await app.close();

    console.log("Shutdown complete");
  } catch (error) {
    app.log.error(error, "Error during shutdown");
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

ruleEvents.on("triggered", (result) => {
  // console.log("🚨 RULE TRIGGERED:", result);
});

const perpetualSymbols = await getPerpetualSymbols();

const symbols = perpetualSymbols
  .map((symbol) => symbol.symbol)
  .filter((symbol): symbol is string => symbol !== undefined);

console.log(`Found ${symbols.length} perpetual symbols`);

await bootstrapKlines(symbols);

console.log("Kline bootstrap completed");

console.log("Starting 1H kline streams...");

const kline1hConnection = await subscribeToKlines(symbols, "1h");

console.log("1H kline streams started");

console.log("Starting 4H kline streams...");

const kline4hConnection = await subscribeToKlines(symbols, "4h");

console.log("4H kline streams started");

await marketDataService.start(symbols);

console.log("Market data service started");

await sleep(1000);

console.log("Starting Open Interest poller...");

const stopOpenInterest = await startOpenInterestPoller(symbols);

await sleep(1000);

const liquidationConnection = await subscribeToLiquidations(symbols);

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
