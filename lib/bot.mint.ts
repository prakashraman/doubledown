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

import { map, sum, filter, each, reduce, add } from "lodash";
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
  logger.info("bot:mint run");
  const items = await getMintItems();
  const now = moment().unix();
  const prices = await getAllPrices();

  Promise.all(
    map(items, async (item) => {
      if (item.nextCheckAt > now) return;

      const price = prices[item.symbol];
      const symbol = item.symbol;

      if (item.nextAction === "PURCHASE" && item.rallyPrice > price) {
        const quantity = item.usd / price;
        logger.info("mint purchase", { bot: "mint", symbol, price, quantity });

        const order = await createLimitOrder({
          symbol,
          price,
          quantity,
          side: "BUY",
        });

        await setItem({
          ...item,
          lastQuantity: order.filledQuantity,
          nextCheckAt: moment.unix(item.nextCheckAt).unix(),
          nextAction: "SELL",
        });
      } else if (
        item.nextAction === "SELL" &&
        increaseByPercent(item.rallyPrice, 0.5) < price
      ) {
        const quantity = item.usd / price;

        logger.info("mint sell", {
          bot: "mint",
          symbol,
          price,
          quantity,
          minted: item.lastQuantity - quantity,
        });

        createLimitOrder({
          symbol,
          price,
          quantity,
          side: "SELL",
        });

        await setItem({
          ...item,
          nextCheckAt: moment.unix(item.nextCheckAt).add(3, "hours").unix(),
          nextAction: "PURCHASE",
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
  await db.setJSON(CONFIG.KEY_MODEL_COLLECTIVE, [
    ...(await getMintItems()),
    item,
  ]);
};

/**
 * Returns a list of items to be minted
 *
 * @returns Promise<MintItem[]>
 */
const getMintItems = async (): Promise<MintItem[]> => {
  return (await (db.getJSON(CONFIG.KEY_MODEL_MINT) || [])) as MintItem[];
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
    []
  );

  await db.setJSON(CONFIG.KEY_MODEL_MINT, items);
};

export default { run };
