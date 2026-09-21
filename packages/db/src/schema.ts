import { sql } from "drizzle-orm";
import {
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const directionEnum = pgEnum("direction", ["LONG", "SHORT"]);

export const tradeOriginEnum = pgEnum("trade_origin", ["MANUAL", "STRATEGY"]);

export const tradeStateEnum = pgEnum("trade_state", [
  "OPEN",
  "CLOSED",
  "REJECTED",
]);

export const orderPurposeEnum = pgEnum("order_purpose", [
  "ENTRY",
  "STOP_LOSS",
  "TAKE_PROFIT",
  "CLOSE",
]);

export const orderSideEnum = pgEnum("order_side", ["BUY", "SELL"]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "NEW",
  "FILLED",
  "CANCELED",
  "REJECTED",
  "EXPIRED",
]);

export const strategyModeEnum = pgEnum("strategy_mode", [
  "ALERT_ONLY",
  "AUTO_TRADE",
]);

// --- Tables ---

export const strategies = pgTable("strategies", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  // The visual-builder condition tree (Stage 3) lives here as-is.
  definition: jsonb("definition").notNull(),
  mode: strategyModeEnum("mode").notNull().default("ALERT_ONLY"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const trades = pgTable("trades", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  direction: directionEnum("direction").notNull(),
  state: tradeStateEnum("state").notNull().default("OPEN"),
  origin: tradeOriginEnum("origin").notNull().default("MANUAL"),
  strategyId: uuid("strategy_id").references(() => strategies.id),

  // numeric(38,18) avoids JS floating-point error on prices/quantities.
  quantity: numeric("quantity", { precision: 38, scale: 18 }).notNull(),
  entryPrice: numeric("entry_price", { precision: 38, scale: 18 }),
  exitPrice: numeric("exit_price", { precision: 38, scale: 18 }),

  openedAt: timestamp("opened_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  exitReason: text("exit_reason"),
});

export const orders = pgTable("orders", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tradeId: uuid("trade_id")
    .notNull()
    .references(() => trades.id),

  // App-generated idempotency key, set BEFORE sending to Binance.
  clientOrderId: text("client_order_id").notNull().unique(),
  exchangeOrderId: text("exchange_order_id"),

  purpose: orderPurposeEnum("purpose").notNull(),
  side: orderSideEnum("side").notNull(),
  type: text("type").notNull(), // e.g. MARKET, STOP_MARKET, TAKE_PROFIT_MARKET
  status: orderStatusEnum("status").notNull().default("PENDING"),

  quantity: numeric("quantity", { precision: 38, scale: 18 }).notNull(),
  price: numeric("price", { precision: 38, scale: 18 }),
  filledQuantity: numeric("filled_quantity", { precision: 38, scale: 18 })
    .notNull()
    .default("0"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  strategyId: uuid("strategy_id")
    .notNull()
    .references(() => strategies.id),
  symbol: text("symbol").notNull(),
  direction: directionEnum("direction").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});
