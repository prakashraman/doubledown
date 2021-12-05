import { table } from "table";
import moment from "moment";
import { map } from "lodash";

import { OptionValues } from "commander";
import { getAllPrices, getPrice } from "../market";
import { addItem, getMintItems, getItem, setItem } from "../bot.mint";
import { increaseByPercent } from "../utils";

const get = async (options: OptionValues) => {
  const items = await getMintItems();
  const prices = await getAllPrices();
  const columns = [
    "ID",
    "Symbol",
    "Next Action",
    "Last Quantity",
    "Rally Price",
    "Current Price",
    "Sell Above",
    "Next Checkin",
  ];

  const data = map(items, (item) => {
    return [
      item.id,
      item.symbol,
      item.nextAction,
      item.lastQuantity,
      item.rallyPrice,
      prices[item.symbol],
      item.nextAction === "SELL"
        ? increaseByPercent(item.lastExecutedPrice, 0.5)
        : "-",
      moment.unix(item.nextCheckAt).format("LLL"),
    ];
  });

  console.log(table([columns, ...data]));
};

const add = async (options: OptionValues) => {
  const { symbol, usd } = options;

  const price = await getPrice(symbol);

  await addItem({
    id: moment().valueOf().toString(),
    symbol,
    usd,
    nextCheckAt: moment().unix(),
    nextAction: "PURCHASE",
    rallyPrice: price,
  });
};

const shiftRally = async (options: OptionValues) => {
  const item = await getItem(options.id);
  const rp = options.rallyprice ?? (await getPrice(item.symbol));

  await setItem({
    ...item,
    rallyPrice: rp,
  });
};

const forceCheckin = async (options: OptionValues) => {
  const item = await getItem(options.id);

  await setItem({
    ...item,
    nextCheckAt: moment().unix(),
  });
};

export default { get, add, shiftRally, forceCheckin };
