import { connectWebSocket } from "./websocket.js";

const connection = await connectWebSocket();

const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

for (const symbol of symbols) {
  const stream = connection.markPriceStream({
    symbol,
  });

  stream.on("message", (data) => {
    console.log("MARK PRICE:", data);
  });
}
