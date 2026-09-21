export type FeatureValidity = "VALID" | "WARMING_UP" | "MISSING";

export type Feature = {
  value: number | null;
  validity: FeatureValidity;
};

export type FeatureSnapshot = {
  symbol: string;
  computedAt: number;

  "ema.1h.9": Feature;
  "ema.1h.21": Feature;
  "ema.4h.9": Feature;
  "ema.4h.21": Feature;

  "funding.rate": Feature;

  "oi.delta_ratio": Feature;
  "oi.price_delta_ratio": Feature;

  "volume.closed_1h_ratio_20": Feature;

  "basis.mark_index_ratio": Feature;

  "liquidations.long_notional_1h": Feature;
  "liquidations.short_notional_1h": Feature;
};

export type FeatureId = keyof Omit<FeatureSnapshot, "symbol" | "computedAt">;
