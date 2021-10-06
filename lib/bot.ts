import { logger } from "./init";
import { getPrice } from "./market";

interface Model {
  symbol: string;
  price: number;
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
const run = async () => {
  logger.info("Checking for changes ...");
  const price = await getPrice(model.symbol);

  logger.info({ ...model, price });
};

export { run };
