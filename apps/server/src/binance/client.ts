import {
  DERIVATIVES_TRADING_USDS_FUTURES_REST_API_PROD_URL,
  DERIVATIVES_TRADING_USDS_FUTURES_WS_STREAMS_PROD_URL,
  DerivativesTradingUsdsFutures,
} from "@binance/derivatives-trading-usds-futures";

const configurationRestAPI = {
  basePath: DERIVATIVES_TRADING_USDS_FUTURES_REST_API_PROD_URL,
  apiKey: "",
  apiSecret: "",
};

const configurationWebsocketStreams = {
  wsURL: DERIVATIVES_TRADING_USDS_FUTURES_WS_STREAMS_PROD_URL,
  reconnectDelay: 5000,
  compression: true,
  mode: "single" as const,
};

export const binance = new DerivativesTradingUsdsFutures({
  configurationRestAPI,
  configurationWebsocketStreams,
});
