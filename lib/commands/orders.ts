import { OptionValues } from "commander";

import { logger } from "../init";
import { getPrice, createLimitOrder } from "../market";

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
