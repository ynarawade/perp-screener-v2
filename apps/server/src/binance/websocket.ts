import { binance } from "./client.js";

export async function connectWebSocket() {
  const connection = await binance.websocketStreams.connect();

  return connection;
}
