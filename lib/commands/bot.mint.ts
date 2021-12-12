import { table } from "table";
import moment from "moment";
import { map, sum } from "lodash";
import humanizeDuration from "humanize-duration";

import { OptionValues } from "commander";
import { getAllPrices, getPrice } from "../market";
import {
  addItem,
  getMintItems,
  getItem,
  setItem,
  removeItemById,
} from "../bot.mint";
import { increaseByPercent } from "../utils";
import { logger } from "../init";

const get = async (options: OptionValues) => {
  const items = await getMintItems();
  const prices = await getAllPrices();
  const columns = [
    "ID",
    "Symbol",
    "Next Action",
    "USD",
    "Rally Price",
    "Current Price",
    "Sell Above",
    "Next Checkin",
    "Minted",
  ];

  const data = map(items, (item) => {
    const diff = moment.unix(item.nextCheckAt).diff(moment());
    const minted = item.minted ?? [];

    return [
      item.id,
      item.symbol,
      item.nextAction,
      item.usd,
      item.rallyPrice,
      prices[item.symbol],
      item.nextAction === "SELL"
        ? increaseByPercent(item.lastExecutedPrice, 0.5).toFixed(2)
        : "-",
      diff > 0
        ? humanizeDuration(diff, { units: ["h", "m"], round: true })
        : "now",
      `${sum(minted)} (${minted.length})`,
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
    minted: [],
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

const remove = async (option: OptionValues) => {
  const id = option.id;
  await removeItemById(id);

  logger.info("item removed", { id });
};

export default { get, add, shiftRally, forceCheckin, remove };
