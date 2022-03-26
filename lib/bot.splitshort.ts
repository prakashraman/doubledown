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
  logger.info("bot:mint splitshort");
};

export default { run };
