import type { FastifyInstance } from "fastify";
import { getMarketData } from "./store.js";

export async function marketRoutes(app: FastifyInstance) {
  app.get<{ Params: { symbol: string } }>(
    "/api/market/:symbol",
    async (request, reply) => {
      const symbol = request.params.symbol.toUpperCase();

      const data = getMarketData(symbol);

      if (!data) {
        return reply.status(404).send({
          error: "Market data not found",
          symbol,
        });
      }

      return data;
    }
  );
}
