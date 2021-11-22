import { table } from "table";
import { reduce, sortBy } from "lodash";

import { logger } from "../init";
import { getAllPrices, getBalances } from "../market";

/**
 * Prints all the balances
 *
 * In a pretty table
 */
const getAll = async () => {
  logger.info("balances");
  const prices = await getAllPrices();

  let data = reduce(
    await getBalances(),
    (acc, balance, coin) => {
      const usdtPrice = prices[`${coin}USDT`];
      let total = 0;

      if (coin === "USDT") total = +balance.toFixed(2);
      else {
        total = usdtPrice ? +(balance * usdtPrice).toFixed(2) : 0;
      }

      if (total < 1) return [...acc]; // skip if less than $1

      return [...acc, [coin, balance, total]];
    },
    []
  );

  data = sortBy(data, (item) => {
    return -item[2]; // ensure the total price is used for sorting
  });

  console.log(table([["Coin", "Amount", "Total (USDT)"], ...data]));
};

export default { getAll };
