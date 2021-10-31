import { filter, map, each } from "lodash";

import { logger } from "./init";
import { getPrice, getOrder } from "./market";
import * as db from "./db";
import { createBuyLimitOrder, createLimitOrder, getTradeInfo } from "./market";
import {
  Purchase,
  PurchaseLevel,
  Level,
  PurchaseInPlay,
  PurchaseLevelMeta,
} from "./types";
import { increaseByPercent } from "./utils";
import CONFIG from "./config";

interface Model {
  symbol: string;
  price: number;
}

const model: Model = {
  symbol: "HOTBUSD",
  price: 1,
};

/**
 * @constant Represents Multiple purchase level.
 *
 *   If The prices drop by 1 percent, 100USD will be purchase, if it drops by 5
 *   percent 200USD will be purchased
 */
const PURCHASE_LEVELS: PurchaseLevel = {
  single: {
    buyAtDropPercent: 2,
    usd: 50,
    sellAtJumpPercent: 1.5,
  },

  double: {
    buyAtDropPercent: 5,
    usd: 100,
    sellAtJumpPercent: 3.5,
  },

  tripple: {
    buyAtDropPercent: 10,
    usd: 200,
    sellAtJumpPercent: 7,
  },
};

const getPurchaseLevelMeta = (level: Level): PurchaseLevelMeta => {
  return PURCHASE_LEVELS[level];
};

/**
 * The main entry function which does all the magic
 *
 * In short:
 *
 * - It reads the market for average prices
 * - Checks if the currency should be bought/sold
 */
const run = async () => {
  logger.info("Checking for changes ...");
  // const price = await getPrice(model.symbol);
  // logger.info({ ...model, price });

  // await checkForPendingPurchases(model.symbol);
  // await checkForPurchase(model, price);
  // const status = await getOrder("HOTBUSD", "39840472");
  // console.log({ status });
  getTradeInfo(model.symbol, 39840472);

  // console.log("it", status.status);

  // createLimitOrder({
  //   symbol: "HOTBUSD",
  //   price: 0.011955002222,
  //   quantity: 2000.1232423423,
  //   side: "BUY",
  // })
  //   .then((r) => {
  //     console.log({ r });
  //   })
  //   .catch((e) => {
  //     console.error(e);
  //   });
};

/**
 * Interate through all of the limit buy order which were placed. And move the
 * FILLED orders into a "inplay" list.
 *
 * It also removes any CANCELED orders
 *
 * @param {string} symbol
 */
const checkForPendingPurchases = async (symbol: string) => {
  const pending = await getPendingPurchasesOf(symbol);
  if (pending.length === 0) return;

  const remainingPending: Purchase[] = [];
  const inplayPurchases: PurchaseInPlay[] = [];

  await Promise.all(
    map(pending, async (p) => {
      const orderStatus = await getOrder(p.symbol, p.orderId);
      const [status, orderId] = [orderStatus.status, p.orderId];

      if (orderStatus.status === "CANCELED") {
        logger.info("removing order. seems to be canceled", {
          status,
          orderId,
        });

        return;
      }

      if (orderStatus.status === "FILLED") {
        logger.info("order filled. moving to inplay list", { status, orderId });
        const inplay: PurchaseInPlay = {
          purchasedWithOrderId: p.orderId,
          symbol: p.symbol,
          purchasedAtPrice: p.price,
          quantity: p.quantity,
          sellAtPrice: p.sellAt,
          purchasedAtLevel: p.level,
        };

        inplayPurchases.push(inplay);
        return;
      }

      remainingPending.push(p);
    })
  );

  savePendingPurchases(remainingPending);
  // TODO: save the inplay
};

/**
 * Determines if a purchase should occur at the current price. And if it should
 * purchased it creates a buy limit order and places the order into a "pending
 * puchases list" (where futher that list is interated on to see if any are filled)
 *
 * @param {Model} model
 * @param {number} price
 */
const checkForPurchase = async (model: Model, currentPrice: number) => {
  const nextLevel = await getNextPurchaseLevel();
  const nextPrice = getPriceAtLevel(model, nextLevel);
  const levelMeta = getPurchaseLevelMeta(nextLevel);
  const symbol = model.symbol;

  if (currentPrice < nextPrice) {
    logger.info("Purchase Now!", { symbol });

    createBuyLimitOrder({
      symbol,
      price: currentPrice,
      quantity: getBuyQuantityForLevel({
        price: currentPrice,
        level: nextLevel,
      }),
    })
      .then(async (result) => {
        const purchase: Purchase = {
          orderId: result.orderId,
          symbol: result.symbol,
          price: result.price,
          quantity: result.quantity,
          time: new Date(),
          level: nextLevel,
          status: result.status,
          sellAt: increaseByPercent(result.price, levelMeta.sellAtJumpPercent),
        };

        await savePendingPurchase(purchase);
      })
      .catch((error) => {
        logger.error(error);
      });
  } else {
    logger.error("Don't purhcase now", { symbol });
  }
};

/**
 * Deterrines the next purchase level.
 *
 * If there are no current existing puchases it will return a 'single' level. If
 * the function return 'null' that implies that all the levels of purchases are
 * complete and we should not be purchasing anymore.
 *
 * @returns {Level | null}
 */
const getNextPurchaseLevel = async (): Promise<Level | null> => {
  return Level.Single;
};

/**
 * Calculate the price at a particular level
 *
 * @param {Model} model
 * @param {Level} level
 * @returns Number
 */
const getPriceAtLevel = (model: Model, level: Level): number => {
  return (
    model.price - (PURCHASE_LEVELS[level].buyAtDropPercent * model.price) / 100
  );
};

type GetBuyQuantityForLevel = {
  price: number;
  level: Level;
};

/**
 * Determines the quantity that needs to be purchased in order to fullfil the
 * purchase level's total.
 *
 * @param {GetBuyQuantityForLevel} meta
 * @returns Number
 */
const getBuyQuantityForLevel = ({
  price,
  level,
}: GetBuyQuantityForLevel): number => {
  const purchaseLevel = PURCHASE_LEVELS[level];
  return purchaseLevel.usd / price;
};

/**
 * Appends a purchase to the pending purchases
 *
 * @param {Purchase} purchase
 */
const savePendingPurchase = async (purchase: Purchase) => {
  const pending = await getPendingPurchases();
  return savePendingPurchases([...pending, purchase]);
};

/**
 * Resets the pending purchases in the database
 *
 * @param {Purchase[]} purchases
 */
const savePendingPurchases = async (purchases: Purchase[]) => {
  return db.setJSON(CONFIG.KEY_PENDING_PURCHASES, [...purchases]);
};

const getPendingPurchases = async (): Promise<Purchase[]> => {
  const value = await db.getJSON(CONFIG.KEY_PENDING_PURCHASES);
  console.log({ value });
  if (!value) return [] as Purchase[];

  return value as Purchase[];
};

/**
 * Return pending purhcases for a symbol
 *
 * @param {string} symbol
 * @returns {Promise<Purchase[]>}
 */
const getPendingPurchasesOf = async (symbol: string): Promise<Purchase[]> => {
  return filter(await getPendingPurchases(), (p) => p.symbol === symbol);
};

export { run, savePendingPurchase };
