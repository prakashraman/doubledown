import { filter, map } from "lodash";

import { logger } from "./init";
import { getPrice } from "./market";
import * as db from "./db";
import { createLimitOrder, isLocked } from "./market";
import {
  PurchaseLevel,
  Level,
  PurchaseInPlay,
  PurchaseLevelMeta,
  LimitOrderResult,
} from "./types";
import { increaseByPercent } from "./utils";
import CONFIG from "./config";

interface Model {
  symbol: string;
  price: number;
}

const models: Model[] = [
  {
    symbol: "HOTBUSD",
    price: 0.01537,
  },
  {
    symbol: "DOTUSDT",
    price: 53.14,
  },
  {
    symbol: "SOLUSDT",
    price: 258.0,
  },
  {
    symbol: "ETHUSDT",
    price: 4820.0,
  },
  {
    symbol: "CHRUSDT",
    price: 0.8413,
  },
];

/**
 * @constant Represents Multiple purchase level.
 *
 *   If The prices drop by 1 percent, 100USD will be purchase, if it drops by 5
 *   percent 200USD will be purchased
 */
const PURCHASE_LEVELS: PurchaseLevel = {
  single: {
    buyAtDropPercent: 2,
    usd: 70,
    sellAtJumpPercent: 1.5,
  },

  double: {
    buyAtDropPercent: 5,
    usd: 120,
    sellAtJumpPercent: 3.5,
  },

  tripple: {
    buyAtDropPercent: 10,
    usd: 210,
    sellAtJumpPercent: 7,
  },
};

const getPurchaseLevelMeta = (level: Level): PurchaseLevelMeta => {
  return PURCHASE_LEVELS[level];
};

/**
 * The main entry function which does all the magic. We iterate over the
 * "models" and run the same logic each time
 *
 * In short:
 *
 * - It reads the market for average prices
 * - Checks if the currency should be bought/sold
 */
const run = async () => {
  logger.info("run");

  await Promise.all(
    map(models, async (model) => {
      const { symbol } = model;

      if (await isLocked(symbol)) {
        logger.info("skipping run as symbol is locked", { symbol });
        return;
      }

      const price = await getPrice(model.symbol);

      await db.set(`price:${symbol}`, `${price}`);
      await checkForPurchase(model, price);
      await checkForSell(model, price);
    })
  );
};

/**
 * Determines if a purchase should occur at the current price. And if it should
 * purchased it creates a buy limit order and places the order into a "pending
 * puchases list" (where futher that list is interated on to see if any are filled)
 *
 * @param {Model} model
 * @param {number} price
 */
const checkForPurchase = async (model: Model, currentPrice: number) => {
  const level = await getNextPurchaseLevel(model.symbol);
  if (level === null) {
    logger.debug("not purchasing as there is a tripple active", {
      symbol: model.symbol,
      level,
    });
    return;
  }

  const price = getPriceAtLevel(model, level);
  const symbol = model.symbol;
  const loggerArgs = {
    currentPrice,
    price,
    plevel: level,
    symbol,
  };

  logger.info("purchase check", { ...loggerArgs });

  if (currentPrice > price) return;

  logger.info("purchase symbol", { ...loggerArgs });

  try {
    const result = await createLimitOrder({
      symbol,
      price: currentPrice,
      side: "BUY",
      quantity: getBuyQuantityForLevel({
        price,
        level,
      }),
    });

    await registerPurhcase(result, level);
  } catch (err) {
    console.log({ err });
    logger.error("purchase failed", { err });
  }
};

/**
 * Store the in play purchase to the database
 *
 * @param {LimitOrderResult} order
 * @param {Level} level
 */
const registerPurhcase = async (order: LimitOrderResult, level: Level) => {
  const levelMeta = getPurchaseLevelMeta(level);
  const purchase: PurchaseInPlay = {
    id: order.orderId,
    symbol: order.symbol,
    limitOrder: order,
    level,
    sellAtPrice: increaseByPercent(order.price, levelMeta.sellAtJumpPercent),
    quantity: order.filledQuantity,
    time: new Date(),
  };

  await savePurchase(purchase);
};

/**
 * Deterrines the next purchase level.
 *
 * If there are no current existing puchases it will return a 'single' level. If
 * the function return 'null' that implies that all the levels of purchases are
 * complete and we should not be purchasing anymore.
 *
 * @returns {Level | null}
 */
const getNextPurchaseLevel = async (symbol: string): Promise<Level | null> => {
  const activeLevels = (await getPurchasesOf(symbol)).map((p) => p.level);

  // If none are present it would imply that none are purchased yet.
  if (activeLevels.length === 0) return Level.Single;

  /**
   * Basically checks if
   *
   * - Single then double
   * - Double then tripple
   * - Tripper then null
   */
  if (activeLevels.includes(Level.Tripple)) return null;
  else if (activeLevels.includes(Level.Double)) return Level.Tripple;
  else if (activeLevels.includes(Level.Single)) return Level.Double;

  return Level.Single;
};

/**
 * Determines if any of the purchases should be sold off. This method looks for
 * the first sellable purchase from the list
 *
 * @param {Model} model
 * @param {number} currentPrice
 */
const checkForSell = async (model: Model, currentPrice: number) => {
  const active = await getPurchasesOf(model.symbol);
  const sellable = active.find((p) => p.sellAtPrice <= currentPrice);
  if (!sellable) return;

  const { symbol, level } = sellable;
  logger.info("sell symbol", { symbol, level, orderId: sellable.id });

  try {
    await createLimitOrder({
      symbol,
      price: currentPrice,
      quantity: sellable.quantity,
      side: "SELL",
    });

    await removePurchase(sellable);
  } catch (error) {
    logger.error("unable to sell", { error, symbol, level });
  }
};

/**
 * Calculate the price at a particular level
 *
 * @param {Model} model
 * @param {Level} level
 * @returns Number
 */
const getPriceAtLevel = (model: Model, level: Level): number => {
  return (
    model.price - (PURCHASE_LEVELS[level].buyAtDropPercent * model.price) / 100
  );
};

type GetBuyQuantityForLevel = {
  price: number;
  level: Level;
};

/**
 * Determines the quantity that needs to be purchased in order to fullfil the
 * purchase level's total.
 *
 * @param {GetBuyQuantityForLevel} meta
 * @returns Number
 */
const getBuyQuantityForLevel = ({
  price,
  level,
}: GetBuyQuantityForLevel): number => {
  const purchaseLevel = PURCHASE_LEVELS[level];
  return purchaseLevel.usd / price;
};

/**
 * Saves the purchase into the datastore
 *
 * @param {PurchaseInPlay} purchase
 * @returns {Promise<string>}
 */
const savePurchase = async (purchase: PurchaseInPlay): Promise<string> => {
  const current = await getPurchases();
  return setPurchases([...current, purchase]);
};

/**
 * Resets the purchases key
 *
 * @param {PurchaseInPlay[]} purchases
 * @returns {Promise<string>}
 */
const setPurchases = async (purchases: PurchaseInPlay[]): Promise<string> => {
  return db.setJSON(CONFIG.KEY_PURCHASES, purchases);
};

/**
 * Returns all the in play purchases. For all symbols
 *
 * @returns {Promise<PurchaseInPlay[]>}
 */
const getPurchases = async (): Promise<PurchaseInPlay[]> => {
  return (await db.getJSON(CONFIG.KEY_PURCHASES)) ?? [];
};

/**
 * Returns the in play purchases of a symbol
 *
 * @param {string} symbol
 * @returns {Promise<PurchaseInPlay[]>}
 */
const getPurchasesOf = async (symbol: string): Promise<PurchaseInPlay[]> => {
  return filter(await getPurchases(), (p) => p.symbol === symbol);
};

/**
 * Removes a purchase from the database
 *
 * @param {PurchaseInPlay} purchase
 * @returns {Promise<PurchaseInPlay>} Purchases
 */
const removePurchase = async (
  purchase: PurchaseInPlay
): Promise<PurchaseInPlay[]> => {
  const updated = filter(
    await getPurchases(),
    (p) => `${p.id}` != `${purchase.id}`
  );

  await setPurchases(updated);

  return updated;
};

export { run, models, getPurchases, getNextPurchaseLevel, getPriceAtLevel };
