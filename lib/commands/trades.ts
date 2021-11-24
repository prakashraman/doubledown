import { table } from "table";
import moment from "moment";

import { OptionValues } from "commander";
import { getTrades } from "../market";

const get = async (options: OptionValues) => {
  const trades = await getTrades(options.symbol);

  const data = trades.map((trade) => [
    trade.orderId,
    trade.price,
    trade.quantity,
    (trade.price * trade.quantity).toFixed(2),
    moment(trade.time).format(),
  ]);

  console.log(table(data));
};

export default { get };
