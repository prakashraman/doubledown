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

import { map, reduce, find } from "lodash";
import moment from "moment";

import { createLimitOrder, getAllPrices } from "./market";
import CONFIG from "./config";
import { logger } from "./init";
import { increaseByPercent } from "./utils";
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
        increaseByPercent(item.lastExecutedPrice, 0.5) < price
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
      } else if (item.nextAction === "SELL") {
        // If unable to sell yet, delay the next check by an hour
        await setItem({
          ...item,
          nextCheckAt: moment().add(1, "hour").unix(),
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
 * Find an item based on id
 *
 * @param {string} id
 * @returns Promise
 */
const getItem = async (id: string): Promise<MintItem> => {
  return find(await getMintItems(), (item) => item.id === id);
};

export default { run };
export { addItem, getMintItems, getItem, setItem };
