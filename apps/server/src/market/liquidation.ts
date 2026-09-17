import WebSocket from "ws";

import { updateLiquidation } from "./store.js";

type CombinedLiquidationMessage = {
  stream: string;
  data: {
    e?: string;
    E?: number;
    o?: {
      s?: string;
      S?: "BUY" | "SELL";
      p?: string;
      q?: string;
    };
  };
};

const BINANCE_WS_URL = "wss://fstream.binance.com/stream";

export function subscribeToLiquidations(symbols: string[]): Promise<WebSocket> {
  const streams = symbols.map((symbol) => `${symbol.toLowerCase()}@forceOrder`);

  const url = `${BINANCE_WS_URL}?streams=${streams.join("/")}`;

  console.log(`[liquidations] Connecting ${symbols.length} symbols`);

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);

    let connected = false;

    socket.on("open", () => {
      connected = true;

      console.log(`[liquidations] Connected ${symbols.length} symbols`);

      resolve(socket);
    });

    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(
          raw.toString()
        ) as CombinedLiquidationMessage;

        const order = message.data?.o;

        if (!order) return;

        const price = Number(order.p);
        const quantity = Number(order.q);

        if (
          !order.s ||
          !order.S ||
          !Number.isFinite(price) ||
          !Number.isFinite(quantity)
        ) {
          return;
        }

        updateLiquidation({
          symbol: order.s,
          side: order.S === "BUY" ? "SHORT" : "LONG",
          price,
          quantity,
          notional: price * quantity,
          eventTime: Number(message.data.E),
        });
      } catch (error) {
        console.error("[liquidations] Failed to process message:", error);
      }
    });

    socket.on("error", (error) => {
      console.error("[liquidations] WebSocket error:", error);

      if (!connected) {
        reject(error);
      }
    });

    socket.on("close", (code, reason) => {
      console.log("[liquidations] WebSocket closed", code, reason.toString());
    });
  });
}
