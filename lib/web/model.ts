import { map, sortBy } from "lodash";

import { getPriceFromDb } from "../market";
import { models, getNextPurchaseLevel, getPriceAtLevel } from "../bot";
import { Level, PurchaseInPlay, CollectivePurchaseStats } from "../types";
import { getStats } from "../bot.collective";

/* ------------------------ TYPES -------------------- */

interface Coin {
  symbol: string;
  price: number;
  modelPrice: number;
  nextPurchase: string | null;
}

interface Purchase {
  id: string | number;
  symbol: string;
  sellAtPrice: string | number;
  price: number;
  level: Level;
}

/**
 * Return the list of coins and their current saved prices
 *
 * @returns Coin
 */
const prices = async (): Promise<Coin[]> => {
  return Promise.all(
    map(
      sortBy(models, (m) => m.symbol),
      async (m) => {
        const nextLevel = await getNextPurchaseLevel(m.symbol);

        return {
          symbol: m.symbol,
          price: await getPriceFromDb(m.symbol),
          modelPrice: m.price,
          nextPurchase: nextLevel
            ? `(${nextLevel}) ${getPriceAtLevel(m, nextLevel)}`
            : "-",
        };
      }
    )
  );
};

/**
 * Serializes a list of purchases for the index page
 *
 * @param {PurchaseInPlay[]} purchases
 * @returns Purchase
 */
const serializePurchases = (purchases: PurchaseInPlay[]): Purchase[] => {
  return sortBy(purchases, (p) => p.symbol).map((p) => ({
    id: p.id,
    symbol: p.symbol,
    sellAtPrice: p.sellAtPrice.toFixed(5),
    price: p.limitOrder.price,
    level: p.level,
  }));
};

/**
 * Fetch the collective stats
 *
 * @returns Promise
 */
const collectiveStats = async (): Promise<CollectivePurchaseStats> => {
  return await getStats();
};

export { prices, serializePurchases, collectiveStats };
