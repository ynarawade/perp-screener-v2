import type { FastifyInstance } from "fastify";
import type { StrategyEngineService } from "../strategy-engine/service.js";

export async function strategyEngineRoutes(
  app: FastifyInstance,
  strategyEngineService: StrategyEngineService
) {
  /**
   * List every registered strategy.
   *
   * GET /api/strategy-engine/strategies
   */
  app.get("/api/strategy-engine/strategies", async () => {
    return {
      data: strategyEngineService.listStrategies(),
    };
  });

  /**
   * Latest evaluation result for every
   * strategy / symbol combination.
   *
   * GET /api/strategy-engine/results
   */
  app.get("/api/strategy-engine/results", async () => {
    const data = strategyEngineService.getResults();

    return {
      count: data.length,
      data,
    };
  });

  /**
   * Only currently matching strategies.
   *
   * GET /api/strategy-engine/matches
   */
  app.get("/api/strategy-engine/matches", async () => {
    const data = strategyEngineService.getMatches();

    return {
      count: data.length,
      data,
    };
  });

  /**
   * Latest strategy evaluation results
   * for one symbol.
   *
   * Example:
   *
   * GET /api/strategy-engine/symbol/BTCUSDT
   */
  app.get<{
    Params: {
      symbol: string;
    };
  }>("/api/strategy-engine/symbol/:symbol", async (request) => {
    const symbol = request.params.symbol.toUpperCase();

    const data = strategyEngineService.getResultsForSymbol(symbol);

    return {
      symbol,
      count: data.length,
      data,
    };
  });

  /**
   * Only MATCH results for one symbol.
   *
   * Example:
   *
   * GET /api/strategy-engine/symbol/BTCUSDT/matches
   */
  app.get<{
    Params: {
      symbol: string;
    };
  }>("/api/strategy-engine/symbol/:symbol/matches", async (request) => {
    const symbol = request.params.symbol.toUpperCase();

    const data = strategyEngineService.getMatchesForSymbol(symbol);

    return {
      symbol,
      count: data.length,
      data,
    };
  });

  /**
   * Strategy engine health / statistics.
   *
   * GET /api/strategy-engine/stats
   */
  app.get("/api/strategy-engine/stats", async () => {
    return {
      data: strategyEngineService.getStats(),
    };
  });

  /**
   * Development / diagnostic endpoint.
   *
   * Forces immediate evaluation using the
   * current MarketSnapshot values.
   *
   * POST /api/strategy-engine/evaluate
   *
   * IMPORTANT:
   * This is only for development/testing.
   * Automatic production evaluation still
   * uses new closed candles.
   */
  app.post("/api/strategy-engine/evaluate", async () => {
    const data = strategyEngineService.evaluateAllNow();

    return {
      evaluated: data.length,

      matches: data.filter((result) => result.status === "MATCH").length,

      data,
    };
  });
}
