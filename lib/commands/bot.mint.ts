import { table } from "table";
import moment from "moment";

import { OptionValues } from "commander";
import { getPrice } from "../market";
import { addItem } from "../bot.mint";

const get = async (options: OptionValues) => {
  console.log("todo");
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

export default { get, add };
