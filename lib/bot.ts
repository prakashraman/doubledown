import { filter, map, each, remove } from "lodash";

import { logger } from "./init";
import { getPrice, getOrder } from "./market";
import * as db from "./db";
import { createLimitOrder, getTradeInfo } from "./market";
import {
  Purchase,
  PurchaseLevel,
  Level,
  PurchaseInPlay,
  PurchaseLevelMeta,
  LimitOrderResult,
} from "./types";
import { increaseByPercent } from "./utils";
import CONFIG from "./config";
import { pushEvalArguments } from "redis/dist/lib/commands/generic-transformers";

interface Model {
  symbol: string;
  price: number;
}

const model: Model = {
  symbol: "HOTBUSD",
  price: 0.014227,
};

/**
 * @constant Represents Multiple purchase level.
 *
 *   If The prices drop by 1 percent, 100USD will be purchase, if it drops by 5
 *   percent 200USD will be purchased
 */
const PURCHASE_LEVELS: PurchaseLevel = {
  single: {
    buyAtDropPercent: 2,
    usd: 50,
    sellAtJumpPercent: 1.5,
  },

  double: {
    buyAtDropPercent: 5,
    usd: 100,
    sellAtJumpPercent: 3.5,
  },

  tripple: {
    buyAtDropPercent: 10,
    usd: 200,
    sellAtJumpPercent: 7,
  },
};

const getPurchaseLevelMeta = (level: Level): PurchaseLevelMeta => {
  return PURCHASE_LEVELS[level];
};

/**
 * The main entry function which does all the magic
 *
 * In short:
 *
 * - It reads the market for average prices
 * - Checks if the currency should be bought/sold
 */
const run = async () => {
  // logger.info("Checking for changes ...");
  // const price = await getPrice(model.symbol);
  // logger.info({ ...model, price });
  // await checkForPurchase(model, price);
  // const status = await getOrder("HOTBUSD", "39840472");
  // console.log({ status });
  // createLimitOrder({
  //   symbol: "HOTBUSD",
  //   price: 0.0126600002222,
  //   quantity: 1996.0997772222,
  //   side: "SELL",
  // })
  //   .then((r) => {
  //     console.log({ r });
  //   })
  //   .catch((e) => {
  //     console.error(e);
  //   });
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

  if (currentPrice < price) {
    logger.info("Purchase Now!", { symbol, currentPrice, price });
    try {
      const result = await createLimitOrder({
        symbol,
        price,
        side: "BUY",
        quantity: getBuyQuantityForLevel({
          price,
          level,
        }),
      });

      registerPurhcase(result, level);
    } catch (err) {
      logger.error("purchase failed", { err });
    }
  } else {
    logger.error("Don't purhcase now", { symbol });
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

const checkForSell = async (model: Model, currentPrice: number) => {
  const active = await getPurchasesOf(model.symbol);
  const sellable = active.find((p) => p.sellAtPrice <= currentPrice);
  if (!sellable) return;

  const { symbol, level } = sellable;
  logger.info("selling symbol", { symbol, level });

  try {
    const result = createLimitOrder({
      symbol,
      price: currentPrice,
      quantity: sellable.quantity,
      side: "SELL",
    });
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
  const updated = remove(
    await getPurchases(),
    (p) => `${p.id}` === `${purchase.id}`
  );
  await setPurchases(updated);

  return updated;
};

export { run };
