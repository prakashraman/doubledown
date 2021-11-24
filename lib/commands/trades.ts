import { table } from "table";
import moment from "moment";

import { OptionValues } from "commander";
import { getTrades } from "../market";

const get = async (options: OptionValues) => {
  const { symbol, latest } = options;
  const trades = await getTrades(symbol);

  const data = trades
    .slice(-latest)
    .map((trade) => [
      trade.orderId,
      trade.price,
      trade.quantity,
      "$ " + (trade.price * trade.quantity).toFixed(2),
      moment(trade.time).format("LLL"),
    ]);

  console.log(
    table(data, {
      header: {
        content: `${symbol} Trades`,
        alignment: "center",
      },
    })
  );
};

export default { get };
