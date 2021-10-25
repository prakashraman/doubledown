import Binance from "node-binance-api";

import CONFIG from "./config";
import { logger } from "./init";

/** The "binance" api */
const binance: Binance = new Binance().options({
  APIKEY: CONFIG.BINANCE_API_KEY,
  APISECRET: CONFIG.BINANCE_API_SECRET,
});

type OrderStatus = {
  symbol: string;
  orderId: number;
  price: string;
  status: string;
  type: string;
  side: "BUY" | "SELL";
};

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

export { binance, getPrice, getOrder };
