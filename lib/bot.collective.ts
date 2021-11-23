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

import { map, filter } from "lodash";

import { getAllPrices } from "./market";
import CONFIG from "./config";
import { logger } from "./init";
import { increaseByPercent } from "./utils";
import { models } from "./bot";

type ModelCollective = string[];

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
    map(symbolsBelowModelPrice, async (symbol) => {
      const price = prices[symbol];
      const quantity = POT_AMOUNT / models.length / price;

      return {
        symbol,
        quantity,
        price,
      };
    })
  );

  console.log({ result });
};

export default { run };
