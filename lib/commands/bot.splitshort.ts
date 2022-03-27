import { table } from "table";
import moment from "moment";
import { map, sum } from "lodash";
import humanizeDuration from "humanize-duration";

import { OptionValues } from "commander";
import { getAllPrices, getPrice } from "../market";
import { logger } from "../init";
import { addItem } from "../bot.splitshort";

const add = async (options: OptionValues) => {
  const { symbol, activateSell } = options;

  logger.info("add", { symbol, activateSell });

  await addItem({
    id: moment().valueOf().toString(),
    symbol,
    nextAction: "SELL",
    nextSell: {
      activate: activateSell,
    },
    growth: [],
  });
};

export default { add };
