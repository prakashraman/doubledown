import Binance from "node-binance-api";
import { boolean as toBoolean } from "boolean";

import CONFIG from "./config";
import { logger } from "./init";
import { OrderStatus } from "./types";
import * as db from "./db";

/** The "binance" api */
const binance: Binance = new Binance().options({
  APIKEY: CONFIG.BINANCE_API_KEY,
  APISECRET: CONFIG.BINANCE_API_SECRET,
});

/**
 * Retrieves the current price from binace for a given symbol
 *
 * @param {string} symbol
 * @returns {number} Price
 */
const getPrice = async (symbol: string): Promise<number> => {
  const ticker = await binance.prices(symbol);

  return (ticker as { [key: string]: number })[symbol];
};

/**
 * Retrieve the order details from binanace
 *
 * Notice the "orderId" being passed explicitly again in the "flags" as for some
 * reason the library was ignoring the first "orderId" param. Oh well!
 *
 * @param {string} symbol
 * @param {string} orderId
 * @returns {Promise<OrderStatus>}
 */
const getOrder = async (
  symbol: string,
  orderId: string
): Promise<OrderStatus> => {
  return new Promise<OrderStatus>((resolve, reject) => {
    binance.orderStatus(
      symbol,
      orderId,
      (error, orderStatus) => {
        if (error) return reject(error);

        return resolve(orderStatus);
      },
      { orderId }
    );
  });
};

/** Props for createBuyLimitOrder function */
type CreateBuyLimitOrderProps = {
  symbol: string;
  quantity: number;
  price: number;
};

/**
 * Place a buy order in binance
 *
 * This operation first creates a buy luck for the symbol, ensuring no futher
 * buys are attempted until the lock is lifted.
 *
 * @param {string} props.symbol
 * @param {number} props.price
 * @param {number} props.quantity
 * @param {CreateBuyLimitOrderProps} }
 */
const createBuyLimitOrder = async ({
  symbol,
  price,
  quantity,
}: CreateBuyLimitOrderProps) => {
  if (await isBuyLocked(symbol)) {
    logger.info("symbol is buy locked", { symbol });
    return;
  }

  logger.info("new buy limit order", { symbol, price, quantity });
  setBuyLock(symbol);
};

/**
 * Sets a buy lock for a symbol.
 *
 * Expected to represent that no more purchases must happen on this symbol
 *
 * @param {string} symbol
 */
const setBuyLock = async (symbol: string) => {
  db.set(`buylock:${symbol}`, "yes");
};

/**
 * Determines is the symbol is buy-locked
 *
 * @param {string} symbol
 * @returns {Promise<Boolean>}
 */
const isBuyLocked = async (symbol: string): Promise<boolean> => {
  const value = await db.get(`buylock:${symbol}`);
  return toBoolean(value);
};

export { binance, getPrice, getOrder, createBuyLimitOrder };
