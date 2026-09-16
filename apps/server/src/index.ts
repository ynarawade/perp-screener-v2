import { buildApp } from "./app.js";
import { getPerpetualSymbols } from "./binance/symbols.js";
import { config } from "./config.js";
import { MarketDataService } from "./market/service.js";
import { RuleEngine } from "./rules/engine.js";
import { ruleEvents } from "./rules/event.js";

const app = buildApp();
const ruleEngine = new RuleEngine();
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
    await app.close();

    console.log("Shutdown complete");
  } catch (error) {
    app.log.error(error, "Error during shutdown");
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

ruleEvents.on("triggered", (result) => {
  console.log("🚨 RULE TRIGGERED:", result);
});

const perpetualSymbols = await getPerpetualSymbols();

const symbols = perpetualSymbols
  .map((symbol) => symbol.symbol)
  .filter((symbol): symbol is string => symbol !== undefined);

console.log(`Found ${symbols.length} perpetual symbols`);

await marketDataService.start();

console.log("Market data service started");

try {
  await app.listen({
    port: config.port,
    host: "0.0.0.0",
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
