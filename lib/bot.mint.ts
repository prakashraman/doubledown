/**
 * Model: Mint
 *
 * The idea behind the "mint" bot, is that it should do it's best to increase
 * the holding of the token I am looking to mint. We should tell it what token
 * to mint and a rally price. This price is used to beside when the token should
 * be purchased and when part of the holding should be sold off and holding the
 * remainder as the minted amount
 *
 * To keep sentiment away from the logic, the mint executions are triggered
 * every 3 hours, albeit keeping a few bounds in mind
 */

import { map, reduce, find, filter } from "lodash";
import moment from "moment";

import { createLimitOrder, getAllPrices } from "./market";
import CONFIG from "./config";
import { logger } from "./init";
import { increaseByPercent, randomNumber } from "./utils";
import { MintItem } from "./types";
import * as db from "./db";
import { hasBalanceForPurchase } from "./bot";

/**
 * Main "run" operation for collective model
 *
 * It performs the "purchase" and "sell" checks
 */
const run = async () => {
  const items = await getMintItems();
  logger.info("bot:mint run", { count: items.length });

  if (items.length === 0) return;

  const prices = await getAllPrices();

  await Promise.all(
    map(items, async (item) => {
      if (item.nextCheckAt > moment().unix()) return;

      const price = prices[item.symbol];
      const symbol = item.symbol;
      const mintedQuantities = getItemMinted(item);

      // Check to see if a purchase can be made
      if (item.nextAction === "PURCHASE" && item.rallyPrice > price) {
        const quantity = item.usd / price;
        logger.info("mint purchase", {
          bot: "mint",
          symbol,
          price,
          quantity,
          usd: item.usd,
        });

        if (!(await hasBalanceForPurchase(symbol, item.usd))) {
          return logger.info("insufficient balance to purchase", {
            symbol,
            bot: "mint",
            amount: item.usd,
          });
        }

        const order = await createLimitOrder({
          symbol,
          price,
          quantity,
          side: "BUY",
        });

        await setItem({
          ...item,
          lastQuantity: order.filledQuantity,
          lastExecutedPrice: order.price,
          nextCheckAt: moment().add(3, "hours").unix(),
          nextAction: "SELL",
        });
      } else if (
        // else check to see if a sale can be made
        item.nextAction === "SELL" &&
        increaseByPercent(item.lastExecutedPrice, 0.5) < price &&
        mintedQuantities.length < CONFIG.BOT_MINT_MAX_ITEMS
      ) {
        const quantity = (item.lastQuantity * item.lastExecutedPrice) / price;
        const minted = item.lastQuantity - quantity;

        logger.info("mint sell", {
          bot: "mint",
          symbol,
          price,
          quantity,
          minted,
        });

        await createLimitOrder({
          symbol,
          price,
          quantity,
          side: "SELL",
        });

        await setItem({
          ...item,
          nextCheckAt: moment().add(3, "hours").unix(),
          nextAction: "PURCHASE",
          minted: [...(item.minted ?? []), minted], // fancy code to make sure it's backward compatible
        });
      } else {
        // If unable to act upon yet, delay the next check by a few minutes random minutes
        await setItem({
          ...item,
          // delays the next check by a random number of mins (< 120)
          nextCheckAt: moment().add(randomNumber(10, 120), "minute").unix(),
        });
      }
    })
  );
};

/**
 * Add an item to the mint process
 *
 * @param {MintItem} item
 */
const addItem = async (item: MintItem) => {
  await db.setJSON(CONFIG.KEY_MODEL_MINT, [...(await getMintItems()), item]);
};

/**
 * Returns a list of items to be minted
 *
 * @returns Promise<MintItem[]>
 */
const getMintItems = async (): Promise<MintItem[]> => {
  return ((await db.getJSON(CONFIG.KEY_MODEL_MINT)) || []) as MintItem[];
};

/**
 * Replaces a particular item in the model
 *
 * @param {MintItem} item
 */
const setItem = async (item: MintItem) => {
  const items = reduce(
    await getMintItems(),
    (acc, curr) => {
      return item.id === curr.id ? [...acc, item] : [...acc, curr];
    },
    [] as MintItem[]
  );

  await db.setJSON(CONFIG.KEY_MODEL_MINT, items);
};

/**
 * Removes a particular item by id
 *
 * @param {string} id
 */
const removeItemById = async (id: string) => {
  const items = filter(await getMintItems(), (item) => {
    return `${item.id}` != id;
  });

  await db.setJSON(CONFIG.KEY_MODEL_MINT, items);
};

/**
 * Find an item based on id
 *
 * @param {string} id
 * @returns Promise
 */
const getItem = async (id: string): Promise<MintItem> => {
  return find(await getMintItems(), (item) => item.id === id);
};

/**
 * Returns an array of minted quantities for the paricular Item
 *
 * @param {MintItem} item
 * @returns Number[]
 */
const getItemMinted = (item: MintItem): number[] => {
  return item.minted || [];
};

/**
 * Returns a more information status for an item
 *
 * E.g considers max number of the items an items has been minted
 *
 * @param {MintItem} item
 * @returns String
 */
const getStatusForItem = (item: MintItem): string => {
  if (
    item.nextAction === "SELL" &&
    getItemMinted(item).length >= CONFIG.BOT_MINT_MAX_ITEMS
  ) {
    return "MAX MINTED (STOPPED)";
  }

  return item.nextAction;
};

export default { run };
export {
  addItem,
  getMintItems,
  getItem,
  setItem,
  removeItemById,
  getItemMinted,
  getStatusForItem,
};
