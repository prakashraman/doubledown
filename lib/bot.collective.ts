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

import { map } from "lodash";

import { createLimitOrder, getAllPrices } from "./market";
import CONFIG from "./config";
import { logger } from "./init";
import { increaseByPercent } from "./utils";
import { LimitOrderResult } from "./types";

type ModelCollective = string[];

type CollectivePurchaseItem = {
  symbol: string;
  price: number;
  filledQuanity: number;
  requestedQuantity: number;
  order: LimitOrderResult;
};

const model: ModelCollective = [
  "HOTUSDT",
  "SOLUSDT",
  "CHRUSDT",
  "ETHUSDT",
  "ANKRUSDT",
];

const POT_AMOUNT = 1000;

/**
 * Main "run" operation for collective model
 *
 * It performs the "purchase" and "sell" checks
 */
const run = () => {
  checkForPurchase();
};

/**
 * Does all the purchases
 *
 * If 4 of 5 symbols are 1 percent below the model price. 5 orders are executed
 */
const checkForPurchase = async () => {
  logger.info("bot collective purchase check", { bot: "collective" });
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

    return price < increaseByPercent(modelPrice, -1) ? symbol : null;
  }).filter((v) => v);

  if (symbolsBelowModelPrice.length < 4) return;

  logger.info("ready to purchase", {
    bot: "collective",
    symbols: symbolsBelowModelPrice,
  });

  const result = await Promise.all(
    map<string, Promise<CollectivePurchaseItem>>(
      symbolsBelowModelPrice,
      async (symbol) => {
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
      }
    )
  );

  console.log({ result });
};

export default { run };
