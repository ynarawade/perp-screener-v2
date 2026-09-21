import { subscribeToBatchedStreams } from "../binance/combines-stream.js";
import { updateLiquidation } from "./store.js";

type CombinedLiquidationMessage = {
  stream: string;
  data: {
    E?: number;
    o?: {
      s?: string;
      S?: "BUY" | "SELL";
      p?: string;
      q?: string;
    };
  };
};

export async function subscribeToLiquidations(symbols: string[]) {
  return subscribeToBatchedStreams({
    symbols,
    label: "liquidations",
    streamName: (symbol) => `${symbol.toLowerCase()}@forceOrder`,
    onMessage: (raw) => {
      const message = raw as CombinedLiquidationMessage;
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
    },
  });
}
