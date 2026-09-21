import type { FeatureId, FeatureSnapshot } from "../features/types.js";

import type {
  ComparisonOperator,
  ConditionEvaluationResult,
  StrategyCondition,
  StrategyDefinition,
  StrategyEvaluationResult,
} from "./types.js";

/**
 * Read one feature from a FeatureSnapshot.
 *
 * A feature can only be used when:
 *
 * validity === "VALID"
 * value !== null
 * value is finite
 */
function getFeatureValue(
  snapshot: FeatureSnapshot,
  featureId: FeatureId
): number | null {
  const feature = snapshot[featureId];

  if (!feature) {
    return null;
  }

  if (feature.validity !== "VALID") {
    return null;
  }

  if (feature.value === null) {
    return null;
  }

  if (!Number.isFinite(feature.value)) {
    return null;
  }

  return feature.value;
}

/**
 * Floating-point safe equality.
 *
 * Useful because indicator values can contain tiny floating-point
 * differences even when logically equal.
 */
function nearlyEqual(a: number, b: number): boolean {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));

  return Math.abs(a - b) <= Number.EPSILON * scale * 10;
}

/**
 * Standard numeric comparison.
 */
function compareValues(
  left: number,
  operator: ComparisonOperator,
  right: number
): boolean {
  switch (operator) {
    case "GT":
      return left > right;

    case "GTE":
      return left > right || nearlyEqual(left, right);

    case "LT":
      return left < right;

    case "LTE":
      return left < right || nearlyEqual(left, right);

    case "EQ":
      return nearlyEqual(left, right);

    case "NEQ":
      return !nearlyEqual(left, right);

    default: {
      const exhaustiveCheck: never = operator;
      throw new Error(
        `Unsupported comparison operator: ${String(exhaustiveCheck)}`
      );
    }
  }
}

/**
 * Evaluate:
 *
 * feature GT/GTE/LT/LTE/EQ/NEQ fixed value
 *
 * Example:
 *
 * funding.rate < -0.0005
 */
function evaluateFeatureValueCondition(
  condition: Extract<StrategyCondition, { type: "FEATURE_VALUE" }>,
  current: FeatureSnapshot
): ConditionEvaluationResult {
  const actualValue = getFeatureValue(current, condition.feature);

  if (actualValue === null) {
    return {
      status: "NOT_READY",
      reason: `${condition.feature} is not ready`,
    };
  }

  const matched = compareValues(
    actualValue,
    condition.operator,
    condition.value
  );

  return {
    status: matched ? "MATCH" : "NO_MATCH",

    reason: `${condition.feature} ${condition.operator} ${condition.value} | actual=${actualValue}`,
  };
}

/**
 * Evaluate:
 *
 * feature A GT/GTE/LT/LTE/EQ/NEQ feature B
 *
 * Example:
 *
 * ema.1h.9 > ema.1h.21
 */
function evaluateFeatureFeatureCondition(
  condition: Extract<StrategyCondition, { type: "FEATURE_FEATURE" }>,
  current: FeatureSnapshot
): ConditionEvaluationResult {
  const leftValue = getFeatureValue(current, condition.left);
  const rightValue = getFeatureValue(current, condition.right);

  if (leftValue === null) {
    return {
      status: "NOT_READY",
      reason: `${condition.left} is not ready`,
    };
  }

  if (rightValue === null) {
    return {
      status: "NOT_READY",
      reason: `${condition.right} is not ready`,
    };
  }

  const matched = compareValues(leftValue, condition.operator, rightValue);

  return {
    status: matched ? "MATCH" : "NO_MATCH",

    reason:
      `${condition.left} ${condition.operator} ${condition.right}` +
      ` | left=${leftValue} right=${rightValue}`,
  };
}

/**
 * Evaluate a REAL crossover.
 *
 * Example:
 *
 * Previous:
 *
 * EMA9  = 99
 * EMA21 = 100
 *
 * Current:
 *
 * EMA9  = 101
 * EMA21 = 100
 *
 * => CROSSES_ABOVE = MATCH
 *
 *
 * Important:
 *
 * The next candle:
 *
 * EMA9  = 102
 * EMA21 = 100
 *
 * is NOT another crossover.
 */
function evaluateCrossCondition(
  condition: Extract<StrategyCondition, { type: "CROSS" }>,
  current: FeatureSnapshot,
  previous?: FeatureSnapshot
): ConditionEvaluationResult {
  if (!previous) {
    return {
      status: "NOT_READY",
      reason: "Previous feature snapshot is required for crossover detection",
    };
  }

  if (previous.symbol !== current.symbol) {
    return {
      status: "NOT_READY",
      reason: "Previous snapshot belongs to a different symbol",
    };
  }

  const previousLeft = getFeatureValue(previous, condition.left);
  const previousRight = getFeatureValue(previous, condition.right);

  const currentLeft = getFeatureValue(current, condition.left);
  const currentRight = getFeatureValue(current, condition.right);

  if (
    previousLeft === null ||
    previousRight === null ||
    currentLeft === null ||
    currentRight === null
  ) {
    return {
      status: "NOT_READY",
      reason: `Crossover features are not ready: ${condition.left} / ${condition.right}`,
    };
  }

  let matched = false;

  switch (condition.operator) {
    case "CROSSES_ABOVE":
      matched = previousLeft <= previousRight && currentLeft > currentRight;

      break;

    case "CROSSES_BELOW":
      matched = previousLeft >= previousRight && currentLeft < currentRight;

      break;

    default: {
      const exhaustiveCheck: never = condition.operator;

      throw new Error(`Unsupported cross operator: ${String(exhaustiveCheck)}`);
    }
  }

  return {
    status: matched ? "MATCH" : "NO_MATCH",

    reason:
      `${condition.left} ${condition.operator} ${condition.right}` +
      ` | previous=${previousLeft}/${previousRight}` +
      ` current=${currentLeft}/${currentRight}`,
  };
}

/**
 * ALL condition.
 *
 * Rules:
 *
 * any NO_MATCH
 * => NO_MATCH
 *
 * otherwise if anything NOT_READY
 * => NOT_READY
 *
 * otherwise
 * => MATCH
 */
function evaluateAllCondition(
  condition: Extract<StrategyCondition, { type: "ALL" }>,
  current: FeatureSnapshot,
  previous?: FeatureSnapshot
): ConditionEvaluationResult {
  if (condition.conditions.length === 0) {
    return {
      status: "NO_MATCH",
      reason: "ALL condition contains no child conditions",
    };
  }

  const results = condition.conditions.map((child) =>
    evaluateCondition(child, current, previous)
  );

  const failed = results.find((result) => result.status === "NO_MATCH");

  if (failed) {
    return {
      status: "NO_MATCH",
      reason: `ALL failed: ${failed.reason ?? "condition did not match"}`,
    };
  }

  const notReady = results.find((result) => result.status === "NOT_READY");

  if (notReady) {
    return {
      status: "NOT_READY",
      reason: `ALL not ready: ${notReady.reason ?? "data unavailable"}`,
    };
  }

  return {
    status: "MATCH",
    reason: "All conditions matched",
  };
}

/**
 * ANY condition.
 *
 * Rules:
 *
 * any MATCH
 * => MATCH
 *
 * otherwise if anything NOT_READY
 * => NOT_READY
 *
 * otherwise
 * => NO_MATCH
 */
function evaluateAnyCondition(
  condition: Extract<StrategyCondition, { type: "ANY" }>,
  current: FeatureSnapshot,
  previous?: FeatureSnapshot
): ConditionEvaluationResult {
  if (condition.conditions.length === 0) {
    return {
      status: "NO_MATCH",
      reason: "ANY condition contains no child conditions",
    };
  }

  const results = condition.conditions.map((child) =>
    evaluateCondition(child, current, previous)
  );

  const matched = results.find((result) => result.status === "MATCH");

  if (matched) {
    return {
      status: "MATCH",
      reason: `ANY matched: ${matched.reason ?? "condition matched"}`,
    };
  }

  const notReady = results.find((result) => result.status === "NOT_READY");

  if (notReady) {
    return {
      status: "NOT_READY",
      reason: `ANY not ready: ${notReady.reason ?? "data unavailable"}`,
    };
  }

  return {
    status: "NO_MATCH",
    reason: "No ANY condition matched",
  };
}

/**
 * NOT condition.
 *
 * MATCH     -> NO_MATCH
 * NO_MATCH  -> MATCH
 * NOT_READY -> NOT_READY
 */
function evaluateNotCondition(
  condition: Extract<StrategyCondition, { type: "NOT" }>,
  current: FeatureSnapshot,
  previous?: FeatureSnapshot
): ConditionEvaluationResult {
  const result = evaluateCondition(condition.condition, current, previous);

  if (result.status === "NOT_READY") {
    return result;
  }

  if (result.status === "MATCH") {
    return {
      status: "NO_MATCH",
      reason: `NOT failed: ${result.reason ?? "nested condition matched"}`,
    };
  }

  return {
    status: "MATCH",
    reason: `NOT matched: ${result.reason ?? "nested condition did not match"}`,
  };
}

/**
 * Main recursive condition evaluator.
 */
export function evaluateCondition(
  condition: StrategyCondition,
  current: FeatureSnapshot,
  previous?: FeatureSnapshot
): ConditionEvaluationResult {
  switch (condition.type) {
    case "FEATURE_VALUE":
      return evaluateFeatureValueCondition(condition, current);

    case "FEATURE_FEATURE":
      return evaluateFeatureFeatureCondition(condition, current);

    case "CROSS":
      return evaluateCrossCondition(condition, current, previous);

    case "ALL":
      return evaluateAllCondition(condition, current, previous);

    case "ANY":
      return evaluateAnyCondition(condition, current, previous);

    case "NOT":
      return evaluateNotCondition(condition, current, previous);

    default: {
      const exhaustiveCheck: never = condition;

      throw new Error(
        `Unsupported strategy condition: ${JSON.stringify(exhaustiveCheck)}`
      );
    }
  }
}

/**
 * Evaluate one complete strategy against one symbol.
 */
export function evaluateStrategy(
  strategy: StrategyDefinition,
  current: FeatureSnapshot,
  previous?: FeatureSnapshot
): StrategyEvaluationResult {
  const evaluatedAt = Date.now();

  if (!strategy.enabled) {
    return {
      strategyId: strategy.id,
      strategyName: strategy.name,
      symbol: current.symbol,
      direction: strategy.direction,
      status: "NO_MATCH",
      evaluatedAt,
      reason: "Strategy is disabled",
    };
  }

  const result = evaluateCondition(strategy.condition, current, previous);

  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    symbol: current.symbol,
    direction: strategy.direction,
    status: result.status,
    evaluatedAt,

    ...(result.reason !== undefined ? { reason: result.reason } : {}),
  };
}
