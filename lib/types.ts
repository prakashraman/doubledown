enum Level {
  Single = "single",
  Double = "double",
  Tripple = "tripple",
}

/**
 * Mentiones the perchange drop at which the purhcase is expected to happen.
 *
 * E.g
 *
 * - Single = 2%
 * - Double = 5%
 * - Tripple = 10%
 */
type PurchaseLevel = {
  [key in Level]: PurchaseLevelMeta;
};

type PurchaseLevelMeta = {
  buyAtDropPercent: number;
  usd: number;
  sellAtJumpPercent: number;
};

/**
 * Represents a certain purchase of a symbol.
 *
 * It holds information of the symbol, purchase status, level, etc
 */
type Purchase = {
  /** The OrderID as returned by the market */
  orderId: number;

  /** The symbol (e.g. BTCUSDT) */
  symbol: string;

  /** Intended price of the the purchase */
  price: number;

  /** Intended quantity of the purchase */
  quantity: number;

  /** Market's status for this particular order */
  status: string;

  /**
   * Based on the level the price at which this purchase should be sold off
   *
   * - E.g. If bought at a 2% then, then should be sold which back up by 1.5%
   * - E.g. If bought at a 5% then, then should be sold which back up by 3%
   */
  sellAt: number;

  /** Time at which the BUY limit was initiated */
  time: Date;

  /** The level at which the purchase happened */
  level: Level;
};

type PurchaseInPlay = {
  symbol: string;
  purchasedWithOrderId: number;
  purchasedAtPrice: number;
  purchasedAtLevel: Level;
  sellAtPrice: number;
  quantity: number;
};

/* --------------- BINANCE TYPES ------------- */
type OrderStatus = {
  symbol: string;
  orderId: number;
  price: string;
  status: string;
  type: string;
  side: "BUY" | "SELL";
};

export {
  PurchaseInPlay,
  Purchase,
  PurchaseLevel,
  PurchaseLevelMeta,
  Level,
  OrderStatus,
};
