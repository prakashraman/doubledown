import { map } from "lodash";
import { table } from "table";

import {
  getStats,
  getCollectivePurchase,
  setPurchase,
} from "../bot.collective";
import { logger } from "../init";

const stats = async () => {
  if (!(await getCollectivePurchase())) {
    logger.info("no active collective purchase");
    return;
  }

  const data = await getStats();
  // Totals
  console.log(
    table([
      ["Sell After Total", data.sellAfterTotal],
      ["Current Total", data.currentTotal],
    ])
  );

  // Line items
  const lineData = map(data.items, (item) => {
    return [item.symbol, item.profit];
  });
  console.log(table([["Symbol", "Profit"], ...lineData]));
};

/** Command: bot:collective:set_price */
const setSellPrice = async (price: number) => {
  const purchase = await getCollectivePurchase();
  if (!purchase) {
    logger.info("no active collective purchase");
    return;
  }

  await setPurchase({ ...purchase, sellAfterTotal: price });
};

export default { stats, setSellPrice };
