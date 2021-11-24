import { table } from "table";
import moment from "moment";

import { logger } from "../init";
import { removePurchase, getPurchases } from "../bot";
import { PurchaseInPlay } from "../types";

/**
 * Prints all the purhcases
 *
 * In a table
 */
const list = async () => {
  const data = (await getPurchases()).map((p) => [
    p.id,
    p.symbol,
    p.level,
    moment(p.time).format("LLL"),
  ]);
  console.log(
    table([["Order ID", "Symbol", "Level", "Time"], ...data], {
      header: { content: "Purchases", alignment: "center" },
    })
  );
};

const remove = async (id: string) => {
  logger.info("remove purhcase", { id });
  const purhcase = { id: id } as PurchaseInPlay;
  await removePurchase(purhcase);
};

export default { list, remove };
