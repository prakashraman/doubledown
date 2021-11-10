import Binance from "node-binance-api";
import { find } from "lodash";

import CONFIG from "./config";
import { logger } from "./init";
import { OrderSide, OrderStatus, LimitOrderResult } from "./types";
import * as db from "./db";
import { increaseByPercent } from "./utils";
import { sendMessage } from "./notify";

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

  return +(ticker as { [key: string]: number })[symbol]; // + sugar to convert to a number
};

/**
 * Returns the stores price from the database.
 *
 * If key is not present, returns 0
 *
 * @param {string} symbol
 * @returns Promise
 */
const getPriceFromDb = async (symbol: string): Promise<number> => {
  return +((await db.get(`price:${symbol}`)) || 0);
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

const createLimitOrder = async ({
  symbol,
  price,
  quantity,
  side,
}: {
  symbol: string;
  price: number;
  quantity: number;
  side: OrderSide;
}): Promise<LimitOrderResult> => {
  if (await isLocked(symbol)) {
    logger.info("symbol locked", { symbol });
    return;
  }

  setLock(symbol);

  const args = {
    symbol,
    price,
    quantity,
    side,
  };

  logger.info("limit order", args);
  sendMessage(`limit order ${JSON.stringify(args)}`);

  const adjusted = await adjustSymbolPriceAndQuantity({
    symbol,

    // adjust the price by 1 percent, just to help ensure that the purchase goes through immediately
    price: increaseByPercent(price, side === "BUY" ? 1 : -1),
    quantity,
  });

  let timer: NodeJS.Timer = null;

  const binanceFn = side === "BUY" ? binance.buy : binance.sell;

  return new Promise<LimitOrderResult>((resolve, reject) => {
    binanceFn(
      symbol,
      adjusted.quantity,
      adjusted.price,
      { type: "LIMIT" },
      (error, response) => {
        if (error) {
          logger.error("failed to placed buy limit", { error: error.toJSON() });
          removeLock(symbol);
          reject(error);
        } else if (response) {
          timer = setInterval(async () => {
            const orderId = response.orderId;
            const orderStatus = await getOrder(symbol, response.orderId);
            logger.info("order status", {
              orderId: response.orderId,
              ...orderStatus,
            });

            if (orderStatus.status === "FILLED") {
              const tradeInfo = await getTradeInfo(symbol, orderId);
              const args = {
                symbol,
                price,
                quantity: adjusted.quantity,
                side,
                orderId,
                commission: tradeInfo.commission,
                filledQuantity: adjusted.quantity - tradeInfo.commission,
              };

              logger.info("order filled", { ...args });

              clearTimeout(timer);
              removeLock(symbol);
              resolve({ ...args });
            } else if (orderStatus.status === "CANCELED") {
              logger.error("order was canceled", { orderId, symbol });

              clearTimeout(timer);
              removeLock(symbol);
              reject(new Error("order was canceled"));
            }

            // else, it'll keep waiting for the order to be filled
          }, 2000);
        }
      }
    );
  });
};

/**
 * Sets a transaction lock on a particular currency
 *
 * @param {string} symbol
 */
const setLock = async (symbol: string) => {
  return db.setJSON(`lock:${symbol}`, { at: new Date() });
};

/**
 * Removes the transaction lock on the currency
 *
 * @param {string} symbol
 */
const removeLock = async (symbol: string) => {
  (await db.getClient()).del(`lock:${symbol}`);
};

/**
 * Checks if the currency is locked
 *
 * @param {string} symbol
 */
const isLocked = async (symbol: string) => {
  return !!(await db.getJSON(`lock:${symbol}`));
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

    if (cached) {
      return resolve(JSON.parse(cached));
    }

    binance.exchangeInfo((error, data) => {
      for (const item of data.symbols) {
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

type TradeInfoResult = {
  symbol: string;
  orderId: number;
  commission: number;
};

/**
 * Returns the trade information. Useful to understand the fee/commission for a
 * particular trade
 *
 * @param {string} symbol
 * @param {number} orderId
 * @returns {Promise<TradeInfoResult>} Info
 */
const getTradeInfo = (
  symbol: string,
  orderId: number
): Promise<TradeInfoResult> => {
  return new Promise<TradeInfoResult>((resolve, reject) => {
    binance.trades(
      symbol,
      (error, info: any[]) => {
        if (error) {
          logger.error("trade info error", { symbol, orderId });
        } else {
          const trade = find(info, (i) => +i.orderId === +orderId);
          if (!trade) {
            logger.error("trade not found", { symbol, orderId });
            reject(new Error("trade not found"));
            return;
          }
          resolve({ symbol, orderId, commission: +trade.commission * 1.2 });
        }
      },
      { orderId }
    );
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

export {
  binance,
  getPrice,
  getOrder,
  createLimitOrder,
  getTradeInfo,
  isLocked,
  getPriceFromDb,
};
