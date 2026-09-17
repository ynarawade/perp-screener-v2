import type { FastifyInstance } from "fastify";
import type { ScreenerService } from "../scoring/service.js";

export async function screenerRoutes(
  app: FastifyInstance,
  screenerService: ScreenerService
) {
  app.get("/api/screener", async () => {
    return {
      data: screenerService.getResults(),
    };
  });
}
