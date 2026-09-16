import type { MarkPriceData } from "../market/types.js";
import { evaluateRule } from "./evaluator.js";

import type { Rule, RuleResult } from "./types.js";

export class RuleEngine {
  private rules = new Map<string, Rule>();

  addRule(rule: Rule) {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string) {
    this.rules.delete(ruleId);
  }

  process(data: MarkPriceData): RuleResult[] {
    const results: RuleResult[] = [];

    for (const rule of this.rules.values()) {
      const result = evaluateRule(rule, data);

      if (result.triggered) {
        results.push(result);
      }
    }

    return results;
  }
}
