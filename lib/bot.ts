import { filter, map, difference } from "lodash";

import { logger } from "./init";
import { getAllPrices, getPrice } from "./market";
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

import { getBalance } from "./balance";

interface Model {
  symbol: string;
  price: number;
}

const { MODEL_PRICES } = CONFIG;

const models: Model[] = [
  {
    symbol: "DOTUSDT",
    price: MODEL_PRICES.DOTUSDT,
  },
  {
    symbol: "SOLUSDT",
    price: MODEL_PRICES.SOLUSDT,
  },
  {
    symbol: "ETHUSDT",
    price: MODEL_PRICES.ETHUSDT,
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
    usd: 40,
    sellAtJumpPercent: 1.1,
  },

  double: {
    buyAtDropPercent: 5,
    usd: 60,
    sellAtJumpPercent: 2.5,
  },

  tripple: {
    buyAtDropPercent: 10,
    usd: 100,
    sellAtJumpPercent: 5,
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
  logger.info("bot:doubledown run");

  const prices = await getAllPrices();

  await Promise.all(
    map(models, async (model) => {
      const { symbol } = model;

      if (await isLocked(symbol)) {
        logger.info("skipping run as symbol is locked", { symbol });
        return;
      }

      const price = prices[model.symbol];

      await db.set(`price:${symbol}`, `${price}`);
      await checkForPurchase(model, price);
    })
  );

  await checkForSell(prices);
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

  if (!(await hasBalanceForPurchase(symbol, PURCHASE_LEVELS[level].usd))) {
    logger.info("insufficient balance for purchase", { plevel: level, symbol });
    return;
  }

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

  const diff = difference(
    [Level.Single, Level.Double, Level.Tripple],
    activeLevels
  );

  // Infers that all possible purchases are made.
  if (diff.length === 0) return null;

  return diff[0];
};
/**
 * Determines if any of the purchases should be sold off. This method looks for
 * the first sellable purchase from the list
 *
 * @param {{ [key: string]: number }} prices
 */
const checkForSell = async (prices: { [key: string]: number }) => {
  const active = await getPurchases();
  const sellable = active.find((p) => p.sellAtPrice <= prices[p.symbol]);
  if (!sellable) return;

  const { symbol, level } = sellable;
  logger.info("sell symbol", { symbol, level, orderId: sellable.id });

  try {
    await createLimitOrder({
      symbol,
      price: prices[sellable.symbol],
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

/**
 * Checks if there is enough balance to purchase a symbol
 *
 * Hack: Ideally we should fetch *any* currency and not just look for USDT or BUSD
 *
 * @param {string} symbol
 * @param {number} total
 * @returns Promise<boolean>
 */
const hasBalanceForPurchase = async (
  symbol: string,
  total: number
): Promise<boolean> => {
  const currency = symbol.includes("USDT") ? "USDT" : "BUSD";

  return (await getBalance(currency)) > increaseByPercent(total, 2);
};

export {
  run,
  models,
  getPurchases,
  getNextPurchaseLevel,
  getPriceAtLevel,
  hasBalanceForPurchase,
  removePurchase,
};
