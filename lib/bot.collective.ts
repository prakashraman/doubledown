/**
 * Model: Collective
 *
 * The idea behind this model is that it purchase a set of symbols. And then
 * when the collective profit of all the symbols reach a particular value, it
 * sells all of them at once.
 *
 * Purchase Logic: 4 out of 5 of the symbols need to be below 1% of the base
 * model price for each symbol.
 */

import { map, sum } from "lodash";
import moment from "moment";

import { createLimitOrder, getAllPrices } from "./market";
import CONFIG from "./config";
import { logger } from "./init";
import { increaseByPercent } from "./utils";
import {
  CollectivePurchase,
  CollectivePurchaseStats,
  ModelCollective,
  CollectivePurchaseItem,
} from "./types";
import * as db from "./db";
import { hasBalanceForPurchase } from "./bot";

const POT_AMOUNT = CONFIG.BOT_COLLECTIVE_POT;

const model: ModelCollective = [
  "HOTUSDT",
  "SOLUSDT",
  "BTCUSDT",
  "ETHUSDT",
  "FILUSDT",
];

/**
 * Main "run" operation for collective model
 *
 * It performs the "purchase" and "sell" checks
 */
const run = async () => {
  logger.info("bot:collective run");
  const purchase = await getCollectivePurchase();

  // If there is a purchase in the database, it attempts to sell if off
  // else ofcourse attempt to purchase
  if (purchase) {
    checkForSale(purchase);
  } else {
    checkForPurchase();
  }
};

/**
 * Does all the purchases
 *
 * If 4 of 5 symbols are 1 percent below the model price. 5 orders are executed
 */
const checkForPurchase = async () => {
  const prices = await getAllPrices();
  const symbolsBelowModelPrice = map(model, (symbol) => {
    const modelPrice = CONFIG.MODEL_PRICES[symbol];
    const price = prices[symbol];

    if (!modelPrice) {
      logger.error("symbol price not defined", {
        model: "collective",
        symbol,
      });
      throw new Error(`symbol price not defined for ${symbol}`);
    }

    return price < increaseByPercent(modelPrice, -3) ? symbol : null;
  }).filter((v) => v);

  if (symbolsBelowModelPrice.length < 3) {
    logger.info("not ready to purchase", {
      bot: "collective",
      symbols: symbolsBelowModelPrice,
    });
    return;
  }

  logger.info("ready to purchase", {
    bot: "collective",
    symbols: symbolsBelowModelPrice,
  });

  if (!(await hasBalanceForPurchase("USDT", POT_AMOUNT))) {
    logger.info("insufficient balanace for collective purchase", {
      pot: POT_AMOUNT,
    });
    return;
  }

  const result = await Promise.all(
    map<string, Promise<CollectivePurchaseItem>>(model, async (symbol) => {
      const price = prices[symbol];
      const quantity = POT_AMOUNT / model.length / price;

      const order = await createLimitOrder({
        symbol,
        price,
        quantity,
        side: "BUY",
      });

      return {
        symbol,
        requestedQuantity: quantity,
        price,
        filledQuanity: order.filledQuantity,
        order,
      };
    })
  );

  const purchase: CollectivePurchase = {
    pot: POT_AMOUNT,
    sellAfterTotal: increaseByPercent(POT_AMOUNT, 1),
    time: moment().format(),
    items: result,
  };

  await setPurchase(purchase);
};

/**
 * Update's the purchase in the database
 *
 * @param {CollectivePurchase} purchase
 */
const setPurchase = async (purchase: CollectivePurchase) => {
  await db.setJSON(CONFIG.KEY_MODEL_COLLECTIVE, purchase);
};

/**
 * The method checks is the collective total are more than the "sellAfterTotal".
 *
 * All the purchases are sold off at that instant regardless if individually
 * there are in profit or not. The idea is that collectively we'd need to be profit
 */
const checkForSale = async (purchase: CollectivePurchase) => {
  const prices = await getAllPrices();

  const total = sum(
    map(purchase.items, (item) => {
      return prices[item.symbol] * item.filledQuanity;
    })
  );

  if (total >= purchase.sellAfterTotal) {
    logger.info("collective selling", { model: "collective" });
    try {
      const result = await Promise.all(
        map(purchase.items, async (purhcase) => {
          return await createLimitOrder({
            symbol: purhcase.symbol,
            price: prices[purhcase.symbol],
            quantity: purhcase.filledQuanity,
            side: "SELL",
          });
        })
      );

      (await db.getClient()).DEL(CONFIG.KEY_MODEL_COLLECTIVE);
    } catch (error) {
      logger.error("unable to collective sell", { error });
    }
  } else {
    logger.info("collective not ready to sell", { total });
  }
};

/**
 * Determines if there is an active purchase.
 *
 * It just looks for the presense of the "key"
 *
 * @returns Promise<boolean>
 */
const getCollectivePurchase = async (): Promise<null | CollectivePurchase> => {
  return (await db.getJSON(CONFIG.KEY_MODEL_COLLECTIVE)) as CollectivePurchase;
};

/**
 * Constructs a usable structure to decipher the current status of the collective purchase
 *
 * @returns Promise
 */
const getStats = async (): Promise<CollectivePurchaseStats> => {
  const purchase = await getCollectivePurchase();

  if (!purchase) return null;

  const prices = await getAllPrices();
  const items = map(purchase.items, (item) => {
    return {
      symbol: item.symbol,
      profit: +(
        (prices[item.symbol] - item.price) *
        item.filledQuanity
      ).toFixed(4),
      item,
    };
  });

  const currentTotal = +sum(
    map(purchase.items, (item) => {
      return prices[item.symbol] * item.filledQuanity;
    })
  ).toFixed(2);

  return {
    sellAfterTotal: purchase.sellAfterTotal,
    currentTotal: currentTotal,
    items,
  };
};

export default { run };
export { getCollectivePurchase, getStats, setPurchase };
