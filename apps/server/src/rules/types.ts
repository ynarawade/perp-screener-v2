import type { MarkPriceData } from "../market/types.js";

export type RuleType = "FUNDING_RATE";

export type RuleCondition = "GREATER_THAN" | "LESS_THAN";

export type Rule = {
  id: string;
  name: string;
  type: RuleType;
  condition: RuleCondition;
  threshold: number;
};

export type RuleResult = {
  ruleId: string;
  symbol: string;
  triggered: boolean;
  value: number;
  threshold: number;
};

export type RuleEvaluator = (rule: Rule, data: MarkPriceData) => RuleResult;
