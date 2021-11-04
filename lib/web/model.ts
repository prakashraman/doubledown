import { map } from "lodash";

import * as db from "../db";
import { getPriceFromDb } from "../market";
import { models } from "../bot";

/* ------------------------ TYPES -------------------- */

interface Coin {
  symbol: string;
  price: number;
}

/**
 * Return the list of coins and their current saved prices
 *
 * @returns Coin
 */
const prices = async (): Promise<Coin[]> => {
  return Promise.all(
    map(models, async (m) => ({
      symbol: m.symbol,
      price: await getPriceFromDb(m.symbol),
    }))
  );
};

export { prices };
