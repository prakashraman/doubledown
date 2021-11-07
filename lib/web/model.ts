import { map } from "lodash";

import { getPrice, getPriceFromDb } from "../market";
import { models, getNextPurchaseLevel, getPriceAtLevel } from "../bot";
import { Level, PurchaseInPlay } from "../types";

/* ------------------------ TYPES -------------------- */

interface Coin {
  symbol: string;
  price: number;
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
    map(models, async (m) => {
      const nextLevel = await getNextPurchaseLevel(m.symbol);

      return {
        symbol: m.symbol,
        price: await getPriceFromDb(m.symbol),
        nextPurchase: nextLevel
          ? getPriceAtLevel(m, nextLevel).toString()
          : "-",
      };
    })
  );
};

/**
 * Serializes a list of purchases for the index page
 *
 * @param {PurchaseInPlay[]} purchases
 * @returns Purchase
 */
const serializePurchases = (purchases: PurchaseInPlay[]): Purchase[] => {
  return map(purchases, (p) => ({
    id: p.id,
    symbol: p.symbol,
    sellAtPrice: p.sellAtPrice.toFixed(5),
    price: p.limitOrder.price,
    level: p.level,
  }));
};

export { prices, serializePurchases };
