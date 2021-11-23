import { OptionValues } from "commander";

import { logger } from "../init";
import { getPrice, createLimitOrder } from "../market";

/**
 * Place an order.
 *
 * Handles both BUY and SELL orders
 *
 * Usage: orders:order -s LTCUSDT -u 100 -si BUY
 *
 * @param {OptionValues} options
 */
const order = async (options: OptionValues) => {
  const { symbol, side } = options;
  const price = await getPrice(symbol);
  const quantity = options.usdt / price;

  logger.info("order", { options, price: price, quantity, side });

  try {
    await createLimitOrder({ symbol, price, quantity, side });
  } catch (err) {
    logger.error("unable to place order", { err });
  }
};

export default { order };
