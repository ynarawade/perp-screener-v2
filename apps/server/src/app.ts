import cors from "@fastify/cors";
import Fastify from "fastify";

import { screenerRoutes } from "./routes/screener.js";
import type { ScreenerService } from "./scoring/service.js";

export function buildApp(screenerService: ScreenerService) {
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

  void app.register(screenerRoutes, screenerService);

  return app;
}
