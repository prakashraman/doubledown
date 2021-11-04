import { map } from "lodash";

import * as db from "../db";
import { getPriceFromDb } from "../market";
import { models } from "../bot";
import { Level, PurchaseInPlay } from "../types";

/* ------------------------ TYPES -------------------- */

interface Coin {
  symbol: string;
  price: number;
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
    map(models, async (m) => ({
      symbol: m.symbol,
      price: await getPriceFromDb(m.symbol),
    }))
  );
};

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
