import { logger } from "./init";
import { getPrice, getOrder } from "./market";
import * as db from "./db";
import { Purchase, PurchaseLevel, Level } from "./types";

interface Model {
  symbol: string;
  price: number;
}

const model: Model = {
  symbol: "BTCUSDT",
  price: 50000,
};

/**
 * @constant Represents Multiple purchase level.
 *
 *   If The prices drop by 1 percent, 100USD will be purchase, if it drops by 5
 *   percent 200USD will be purchased
 */
const PURCHASE_LEVELS: PurchaseLevel = {
  single: 1,
  double: 5,
  tripple: 10,
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
  logger.info("Checking for changes ...");
  const price = await getPrice(model.symbol);
  logger.info({ ...model, price });

  // checkForPurchase(model, price);
  // const status = await getOrder("ONTUSDT", "1016500835");
  // console.log("it", status.status);
};

/**
 * Determines if a purchase should occur at the current price
 *
 * @param {Model} model
 * @param {number} price
 */
const checkForPurchase = async (model: Model, currentPrice: number) => {
  const nextLevel = await getNextPurchaseLevel();
  const nextPrice = getPriceAtLevel(model, nextLevel);
  const symbol = model.symbol;

  if (currentPrice < nextPrice) {
    logger.info("Purchase Now!", { symbol });
  } else {
    logger.error("Don't purhcase now", { symbol });
  }
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
const getNextPurchaseLevel = async (): Promise<Level | null> => {
  return Level.Single;
};

/**
 * Calculated the price at a particular level
 *
 * @param {Model} model
 * @param {Level} level
 * @returns Number
 */
const getPriceAtLevel = (model: Model, level: Level): number => {
  return model.price - (PURCHASE_LEVELS[level] * model.price) / 100;
};

export { run };
