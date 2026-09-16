import { getExchangeInformation } from "./rest.js";

export async function getPerpetualSymbols() {
  const exchangeInfo = await getExchangeInformation();

  const symbols = exchangeInfo.symbols ?? [];

  return symbols.filter(
    (symbol) =>
      symbol.contractType === "PERPETUAL" &&
      symbol.quoteAsset === "USDT" &&
      symbol.status === "TRADING"
  );
}
