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
  id: string | number;
  symbol: string;
  level: Level;
  sellAtPrice: number;

  // This will correspond to the actual filled quantity
  quantity: number;

  limitOrder: LimitOrderResult;

  time: Date;
};

type LimitOrderResult = {
  orderId: number | string;
  symbol: string;
  price: number;
  quantity: number;
  side: "BUY" | "SELL";
  commission: number;
  filledQuantity: number;
};

/* ---------- COLLECTIVE BOT -------------- */

type ModelCollective = string[];

type CollectivePurchaseItem = {
  symbol: string;
  price: number;
  filledQuanity: number;
  requestedQuantity: number;
  order: LimitOrderResult;
};

type CollectivePurchase = {
  pot: number;
  sellAfterTotal: number;
  time: string;
  items: CollectivePurchaseItem[];
};

type CollectivePurchaseStats = {
  sellAfterTotal: number;
  currentTotal: number;
  items: {
    symbol: string;
    item: CollectivePurchaseItem;
    profit: number;
  }[];
};

/* ------------- BOT:MINT ---------*/
type MintItem = {
  id: string;
  symbol: string;
  rallyPrice: number;
  nextAction: "PURCHASE" | "SELL";
  usd: number;
  nextCheckAt: number;
  lastQuantity?: number;
  lastExecutedPrice?: number;
  minted?: number[];
};

/* ---------- BOT:SPLITSHORT ------------- */
type SplitShortItem = {
  id: string;
  symbol: string;
  nextAction: "PURCHASE" | "SELL";
  status?: string;
  purchaseUsd?: number;

  // Determines when the SELL workflow would go into motion.
  // Once the current prices reaches the nextSell.activate the
  // nextSell.below is set and when the price falls below nextSell.below
  // the SELL is executed
  nextSell: {
    below?: number | null;
    activate: number;
  };

  // Determines when the BUY workflow would go into motion
  // Once the price reaches below the "activate" the "nextBuy.above" is set
  // And once price reached above "nextBuy.above" BUY is executed
  nextBuy?: {
    above?: number | null;
    activate: number;
  };

  // deprecated
  nextPurchaseBelow?: number;

  // When a PURCHASE is made the new balance of the coin will be inserted
  growth: number[];
};

type SplitShort = {
  [key: string]: SplitShortItem;
};
/* --------------- BINANCE TYPES ------------- */

type OrderSide = "BUY" | "SELL";
type OrderStatus = {
  symbol: string;
  orderId: number;
  price: string;
  status: string;
  type: string;
  side: "BUY" | "SELL";
};

type BalancesResponse = {
  [key: string]: { available: string };
};

type BalancesResult = {
  [key: string]: number;
};

type TradeResult = {
  orderId: string;
  price: number;
  quantity: number;
  commission: number;
  commissionAsset: string;
  symbol: string;
  time: number;
  isBuyer: boolean;
};

export {
  PurchaseInPlay,
  Purchase,
  PurchaseLevel,
  PurchaseLevelMeta,
  Level,
  OrderStatus,
  OrderSide,
  LimitOrderResult,
  BalancesResponse,
  BalancesResult,
  TradeResult,
  CollectivePurchaseStats,
  CollectivePurchase,
  CollectivePurchaseItem,
  ModelCollective,
  MintItem,
  SplitShortItem,
  SplitShort,
};
