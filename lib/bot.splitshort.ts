/**
 * Model: Split Short
 *
 * The idea behind the "split short" bot, is that a certain amount of a coin
 * (say 50%) will be sold when price reaches a certain percent increase (say 5%)
 * and it coin will be re-purchased for the same amount of USD earned during the
 * sell when the price reaches a certain percent decrease (say 5%) at the time
 * it was sold
 */

import { map, reduce, find, filter } from "lodash";
import moment from "moment";

import { createLimitOrder, getAllPrices, getBalances } from "./market";
import CONFIG from "./config";
import { logger } from "./init";
import { increaseByPercent, randomNumber } from "./utils";
import { SplitShort, SplitShortItem } from "./types";
import * as db from "./db";
import { hasBalanceForPurchase } from "./bot";

/**
 * Main "run" operation for collective model
 *
 * It performs the "purchase" and "sell" checks
 */
const run = async () => {
  logger.info("bot:mint splitshort");
  const items = await getItems();
  const prices = await getAllPrices();
  const balances = await getBalances();

  console.log({ balances, items });

  await Promise.all(
    map(items, async (item) => {
      const price = prices[item.symbol];
      const symbol = item.symbol;

      // if (item.nextAction === "PURCHASE" && price < item.nextPurchaseBelow) {
      //   const quantity = item.usd / price;
      //   logger.info("mint purchase", {
      //     bot: "splitshort",
      //     symbol,
      //     price,
      //     quantity,
      //   });

      //   if (!(await hasBalanceForPurchase(symbol, item.usd))) {
      //     return logger.info("insufficient balance to purchase", {
      //       symbol,
      //       bot: "mint",
      //       amount: item.usd,
      //     });
      //   }

      //   const order = await createLimitOrder({
      //     symbol,
      //     price,
      //     quantity,
      //     side: "BUY",
      //   });
      // }

      return true;
    })
  );
};

/**
 * Return the entire structure of the model
 *
 * @returns Promise<SplitShort>
 */
const get = async (): Promise<SplitShort> => {
  return (await db.getJSON(CONFIG.KEY_MODEL_SPLITSHORT)) || {};
};

/**
 * Returns the list of items
 *
 * @returns Promise
 */
const getItems = async (): Promise<SplitShortItem[]> => {
  return [];
};

/**
 * Adds an item to the database
 *
 * @param {SplitShortItem} item
 */
const addItem = async (item: SplitShortItem) => {
  throw new Error("Symbol is already present in the database");
};

export default { run };
export { addItem };
