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
      trade.isBuyer ? "BUY" : "SELL",
      trade.price,
      trade.quantity,
      `${trade.commission} (${trade.commissionAsset})`,
      "$ " + (trade.price * trade.quantity).toFixed(2),
      moment(trade.time).format("LLL"),
    ]);

  const columns = [
    "Order ID",
    "Side",
    "Price",
    "Quantity",
    "Commission",
    "Total (USD)",
    "Time",
  ];
  console.log(
    table([columns, ...data], {
      header: {
        content: `${symbol} Trades`,
        alignment: "center",
      },
    })
  );
};

export default { get };
