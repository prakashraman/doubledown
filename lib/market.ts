import Binance from "node-binance-api";
import { boolean as toBoolean } from "boolean";
import { find, reject } from "lodash";

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
  orderId: string | number
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

type CreateBuyLimitOrderResult = {
  price: number;
  orderId: number;
  status: string;
  symbol: string;
  quantity: number;
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
}: CreateBuyLimitOrderProps): Promise<CreateBuyLimitOrderResult> => {
  if (await isBuyLocked(symbol)) {
    logger.info("symbol is buy locked", { symbol });
    return null;
  }

  return new Promise<CreateBuyLimitOrderResult>(async (resolve, reject) => {
    logger.info("new buy limit order", { symbol, price, quantity });
    setBuyLock(symbol);

    const adjusted = await adjustSymbolPriceAndQuantity({
      symbol,
      price: 0.006343123434,
      quantity: 11100.2323435,
    });

    binance.buy(
      symbol,
      adjusted.quantity,
      adjusted.price,
      { type: "LIMIT" },
      (error, response) => {
        console.log({ error, response });
        if (!error) {
          resolve({
            orderId: response.orderId,
            symbol,
            price: +response.price, // the sugar "+" ensure the price is a number
            status: response.status,
            quantity: +response.origQty, // see above comment,
          });

          removeBuyLock(symbol);
          return;
        }

        logger.error("failed to placed buy limit", { error: error.toJSON() });
        reject(error);
      }
    );
  });
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
 * Removes the buy lock on the symbol
 *
 * @param {string} symbol
 */
const removeBuyLock = async (symbol: string) => {
  (await db.getClient()).del(`buylock:${symbol}`);
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

/**
 * Retrieve the exchange info for a symbol from binance.
 *
 * The method first checks the cache else queries the binance api.
 *
 * @param {string} symbol
 * @returns Promise
 */
const getExchangeInfo = async (symbol: string): Promise<any> => {
  const dbkey = `exchangeinfo:${symbol}`;
  return new Promise<any>(async (resolve, reject) => {
    const cached = await db.get(dbkey);

    if (!!cached) {
      return resolve(JSON.parse(cached));
    }

    binance.exchangeInfo((error, data) => {
      for (let item of data.symbols) {
        if (item.symbol === symbol) {
          db.set(dbkey, JSON.stringify(item));
          resolve(item);

          return;
        }
      }

      if (error) {
        return reject(error);
      }
    });
  });
};

type AdjustSymbolPriceAndQuantityProps = {
  symbol: string;
  price: number;
  quantity: number;
};

/**
 * Adjust the price and quantity for a given symbol, based on the LOT_SIZE and
 * TICK_SIZE from binance's exhange info.
 *
 * If these values are not adjusted binance orders will not go through
 *
 * @param {AdjustSymbolPriceAndQuantityProps} props
 * @returns Number
 */
const adjustSymbolPriceAndQuantity = async ({
  symbol,
  price,
  quantity,
}: AdjustSymbolPriceAndQuantityProps): Promise<{
  price: number;
  quantity: number;
}> => {
  const einfo = await getExchangeInfo(symbol);
  const stepSize = find(
    einfo.filters,
    (f) => f.filterType === "LOT_SIZE"
  ).stepSize;
  const tickSize = find(
    einfo.filters,
    (f) => f.filterType === "PRICE_FILTER"
  ).tickSize;

  return {
    price: binance.roundTicks(price, `${tickSize}`),
    quantity: binance.roundStep(quantity, `${stepSize}`),
  };
};

export { binance, getPrice, getOrder, createBuyLimitOrder };
