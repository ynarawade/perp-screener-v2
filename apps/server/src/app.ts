import Fastify from "fastify";
import { marketRoutes } from "./market/route.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.get("/api/health", async () => {
    return {
      status: "ok",
      service: "perp-screener-api",
    };
  });

  app.register(marketRoutes);

  return app;
}
