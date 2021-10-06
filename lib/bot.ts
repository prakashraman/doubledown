import { logger } from "./init";

interface Model {
  symbol: String;
  price: Number;
}

const model: Model = {
  symbol: "BTCUSDT",
  price: 50000,
};

/**
 * The main entry function which does all the magic
 *
 * In short:
 * - It reads the market for average prices
 * - Checks if the currency should be bought/sold
 */
const run = () => {
  logger.info({ model, msg: "this is nice" });
};

export { run };
