/**
 * Model: Split Short
 *
 * The idea behind the "split short" bot, is that a certain amount of a coin
 * (say 50%) will be sold when price reaches a certain percent increase (say 5%)
 * and it coin will be re-purchased for the same amount of USD earned during the
 * sell when the price reaches a certain percent decrease (say 5%) at the time
 * it was sold
 */

import { map, max, min } from "lodash";

import {
  createLimitOrder,
  getAllPrices,
  getBalances,
  isLocked,
} from "./market";
import CONFIG from "./config";
import { logger } from "./init";
import { getCoinFromSymbol, increaseByPercent } from "./utils";
import { SplitShort, SplitShortItem } from "./types";
import * as db from "./db";
import { updateBalances } from "./balance";

/**
 * Main "run" operation for collective model
 *
 * It performs the "purchase" and "sell" checks
 */
const run = async () => {
  logger.info("bot:splitshort");
  const items = await getItems();
  const prices = await getAllPrices();
  const balances = await getBalances();

  for (const item of items) {
    const price = prices[item.symbol];
    const symbol = item.symbol;
    const balance = balances[item.symbol.replace("USDT", "")];

    if (await isLocked(symbol)) {
      logger.info("bot:splitshort symbol locked", { symbol });
      continue;
    }

    logger.info("bot splitshort precheck", {
      action: item.nextAction,
      symbol,
      price,
      nextSell: item.nextSell,
    });

    if (
      item.nextAction === "PURCHASE" &&
      item.nextBuy.above &&
      price > item.nextBuy.above
    ) {
      const quantity = item.purchaseUsd / price;
      logger.info("bot:splitshort", {
        quantity,
        price,
        symbol,
        action: "PURCHASE ABOVE",
      });

      const result = await createLimitOrder({
        symbol,
        price,
        quantity,
        side: "BUY",
      });

      console.log({ result });

      const updatedBalances = await updateBalances();
      await updateItem({
        ...item,
        nextAction: "SELL",
        purchaseUsd: null,
        nextPurchaseBelow: null,
        nextBuy: null,
        nextSell: {
          activate: increaseByPercent(
            price,
            CONFIG.BOT_SPLITSHORT_SELL_ACTIVATE
          ),
        },
        growth: [...item.growth, updatedBalances[getCoinFromSymbol(symbol)]],
      });
    } else if (
      item.nextAction === "PURCHASE" &&
      price < item.nextBuy.activate
    ) {
      logger.info("splitshort", {
        bot: "splitshort",
        action: "PURCHASE ACTIVATE",
        symbol,
      });

      // Set the "above" to be lower than the previous above
      // if set
      const above = min([
        increaseByPercent(price, CONFIG.BIT_SPLITSHORT_BUY_ABOVE_ACTIVATE),
        item.nextBuy.above,
      ]);

      await updateItem({
        ...item,
        nextBuy: {
          ...item.nextBuy,
          above,
        },
      });
    } else if (
      item.nextAction === "SELL" &&
      item.nextSell &&
      item.nextSell.below &&
      price < item.nextSell.below
    ) {
      logger.info("splitshort", {
        bot: "splitshort",
        action: "SELL BELOW",
        symbol,
      });

      const result = await createLimitOrder({
        symbol,
        price,
        quantity: balance * CONFIG.BOT_SPLITSHORT_SELL_QUANTITY_SHARE,
        side: "SELL",
      });

      console.log({ result });

      await updateItem({
        ...item,
        nextAction: "PURCHASE",
        nextSell: null,
        nextBuy: {
          activate: increaseByPercent(
            price,
            -CONFIG.BIT_SPLITSHORT_BUY_ACTIVATE
          ),
        },
        purchaseUsd: result.filledQuantity * price,
      });
    } else if (
      item.nextAction === "SELL" &&
      item.nextSell &&
      item.nextSell.activate &&
      price > item.nextSell.activate
    ) {
      logger.info("splitshort", {
        bot: "splitshort",
        action: "SELL ACTIVATE",
        symbol,
        price,
        activate: item.nextSell.activate,
      });
      // Sets the nextSell.below

      const below = max([
        increaseByPercent(price, -CONFIG.BOT_SPLITSHORT_SELL_BELOW_ACTIVATE),
        item.nextSell.below,
      ]);

      const updatedItem = {
        ...item,
        nextSell: {
          ...item.nextSell,
          below,
        },
      };

      await updateItem(updatedItem);
    }
  }
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
 * Returns the item for a symbol
 *
 * @param {string} symbol
 * @returns Promise<SplitShortItem>
 */
const getBySymbol = async (symbol: string): Promise<SplitShortItem> => {
  const all = await get();

  if (!all[symbol])
    throw new Error(`Symbol ${symbol} is not present in the database`);

  return all[symbol];
};

/**
 * Updates the database with the model
 *
 * @param {SplitShort} f Full structure
 * @returns Promise
 */
const update = async (f: SplitShort): Promise<SplitShort> => {
  await db.setJSON(CONFIG.KEY_MODEL_SPLITSHORT, f);
  return f;
};

/**
 * Returns the list of items
 *
 * @returns Promise
 */
const getItems = async (): Promise<SplitShortItem[]> => {
  const all = await get();

  if (!all) return [];

  return map(all, (item, _key) => item);
};

/**
 * Adds an item to the database
 *
 * @param {SplitShortItem} item
 */
const addItem = async (item: SplitShortItem) => {
  const all = await get();

  if (all[item.symbol])
    throw new Error("Symbol is already present in the database");

  await updateItem(item);
};

/**
 * Updates the item in the database
 *
 * @param {SplitShortItem} item
 */
const updateItem = async (item: SplitShortItem) => {
  const all = await get();
  await update({ ...all, [item.symbol]: item });
};

/**
 * Remove a symbol from the model
 *
 * @param {string} symbol
 */
const remove = async (symbol: string) => {
  const all = await get();
  delete all[symbol];

  logger.info("splitshort: removing symbol", { symbol });
  await update({ ...all });
};

export default { run };
export { addItem, remove, get, getItems, updateItem, getBySymbol };
