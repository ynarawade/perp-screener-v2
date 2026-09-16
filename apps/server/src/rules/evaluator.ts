import type { MarkPriceData } from "../market/types.js";
import type { Rule, RuleResult } from "./types.js";

export function evaluateRule(rule: Rule, data: MarkPriceData): RuleResult {
  let value: number;

  switch (rule.type) {
    case "FUNDING_RATE":
      value = data.fundingRate;
      break;
  }

  let triggered: boolean;

  switch (rule.condition) {
    case "GREATER_THAN":
      triggered = value > rule.threshold;
      break;

    case "LESS_THAN":
      triggered = value < rule.threshold;
      break;
  }

  return {
    ruleId: rule.id,
    symbol: data.symbol,
    triggered,
    value,
    threshold: rule.threshold,
  };
}
