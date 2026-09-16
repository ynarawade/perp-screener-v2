import { EventEmitter } from "node:events";
import type { RuleResult } from "./types.js";

export const ruleEvents = new EventEmitter();

export function emitRuleTriggered(result: RuleResult) {
  ruleEvents.emit("triggered", result);
}
