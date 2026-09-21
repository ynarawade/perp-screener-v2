// apps/server/src/binance/combined-stream.ts

import WebSocket from "ws";

const BINANCE_WS_URL = "wss://fstream.binance.com/stream";

const MAX_STREAMS_PER_CONNECTION = 190;
const RECONNECT_DELAY_MS = 5000;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function connectCombinedStream(
  streams: string[],
  label: string,
  onMessage: (raw: unknown) => void
): { ready: Promise<void>; close: () => void } {
  let socket: WebSocket | null = null;
  let closedIntentionally = false;
  let settled = false;

  let resolveReady!: () => void;
  let rejectReady!: (error: unknown) => void;

  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  function connect() {
    const url = `${BINANCE_WS_URL}?streams=${streams.join("/")}`;

    socket = new WebSocket(url);

    socket.on("open", () => {
      console.log(`[${label}] Connected (${streams.length} streams)`);

      if (!settled) {
        settled = true;
        resolveReady();
      }
    });

    socket.on("message", (raw) => {
      try {
        onMessage(JSON.parse(raw.toString()));
      } catch (error) {
        console.error(`[${label}] Failed to process message:`, error);
      }
    });

    socket.on("error", (error) => {
      console.error(`[${label}] WebSocket error:`, error);

      // Only the very first connection attempt should fail startup.
      // Errors after that are handled by the "close" handler below,
      // which triggers a reconnect.
      if (!settled) {
        settled = true;
        rejectReady(error);
      }
    });

    socket.on("close", (code, reason) => {
      console.log(`[${label}] WebSocket closed`, code, reason.toString());

      if (closedIntentionally) {
        return;
      }

      console.log(`[${label}] Reconnecting in ${RECONNECT_DELAY_MS}ms...`);

      setTimeout(connect, RECONNECT_DELAY_MS);
    });
  }

  connect();

  return {
    ready,
    close: () => {
      closedIntentionally = true;
      socket?.close();
    },
  };
}

export type BatchedStreamHandle = {
  close: () => void;
};

/**
 * Subscribes to one stream per symbol (e.g. `<symbol>@kline_1h`,
 * `<symbol>@forceOrder`), splitting symbols across as many
 * WebSocket connections as needed to stay under Binance's
 * 200-streams-per-connection limit. Each connection reconnects
 * automatically on unexpected close, until `close()` is called.
 */
export async function subscribeToBatchedStreams(options: {
  symbols: string[];
  label: string;
  streamName: (symbol: string) => string;
  onMessage: (raw: unknown) => void;
  maxStreamsPerConnection?: number;
}): Promise<BatchedStreamHandle> {
  const {
    symbols,
    label,
    streamName,
    onMessage,
    maxStreamsPerConnection = MAX_STREAMS_PER_CONNECTION,
  } = options;

  const batches = chunk(symbols, maxStreamsPerConnection);

  console.log(
    `[${label}] Subscribing ${symbols.length} symbols across ${batches.length} connection(s)`
  );

  const connections = batches.map((batch, index) =>
    connectCombinedStream(
      batch.map(streamName),
      `${label}:${index + 1}/${batches.length}`,
      onMessage
    )
  );

  // Only wait for each connection's FIRST successful open before
  // returning — subsequent reconnects happen silently in the background.
  await Promise.all(connections.map((connection) => connection.ready));

  return {
    close: () => {
      for (const connection of connections) {
        connection.close();
      }
    },
  };
}
