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

import { getAllPrices } from "./market";
import CONFIG from "./config";

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
  const prices = await getAllPrices();
  CONFIG.MODEL_PRICES["HOTBUSD"];
};

export default { run };
