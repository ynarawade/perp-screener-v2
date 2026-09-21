import cors from "@fastify/cors";
import Fastify from "fastify";

import { screenerRoutes } from "./routes/screener.js";
import { strategyEngineRoutes } from "./routes/strategy-engine.js";

import type { ScreenerService } from "./scoring/service.js";
import type { StrategyEngineService } from "./strategy-engine/service.js";

export function buildApp(
  screenerService: ScreenerService,
  strategyEngineService: StrategyEngineService
) {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, {
    origin: "http://localhost:5173",
  });

  app.get("/api/health", async () => {
    return {
      status: "ok",
      service: "perp-screener-api",
    };
  });

  /**
   * Existing screener API
   */
  void app.register(screenerRoutes, screenerService);

  /**
   * New Stage 3 Strategy Engine API
   */
  void app.register(strategyEngineRoutes, strategyEngineService);

  return app;
}
