import Binance from "node-binance-api";

/**
 * The "binance" api
 */
const binance = new Binance();

/**
 * Retrieves the current price from binace for a given symbol
 *
 * @param  {string} symbol
 * @returns {number} Price
 */
const getPrice = async (symbol: string): Promise<number> => {
  const ticker = await binance.prices(symbol);
  return (ticker as { [key: string]: number })[symbol];
};

export { binance, getPrice };
