import { BalancesResult } from "./types";
import { getBalances as getMarketBalances } from "./market";
import * as db from "./db";
import CONFIG from "./config";
import { logger } from "./init";

/**
 * Updates the balances which are fetched from the database.
 *
 * Stored as a simple BalancesResult{[key: string]: number}
 */
const updateBalances = async (): Promise<BalancesResult> => {
  logger.info("balance check");
  const balances = await getMarketBalances();

  await db.setJSON(CONFIG.KEY_BALANCES, balances);
  return balances;
};
/**
 * Returns the balances which are stored in the db
 *
 * @returns Promise<BalancesResult>
 */
const getBalances = async (): Promise<BalancesResult> => {
  return ((await db.getJSON(CONFIG.KEY_BALANCES)) as BalancesResult) || {};
};

/**
 * Returns the balance of a particular coin
 *
 * @param {string} coin
 * @returns Promise
 */
const getBalance = async (coin: string): Promise<number> => {
  const all = await getBalances();
  return all[coin] ?? 0;
};

export { updateBalances, getBalance };
