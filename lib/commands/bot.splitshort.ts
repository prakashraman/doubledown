import { table } from "table";
import moment from "moment";
import { map, sum } from "lodash";
import humanizeDuration from "humanize-duration";

import { OptionValues } from "commander";
import { getAllPrices, getPrice } from "../market";
import { logger } from "../init";
import {
  addItem,
  remove as removeSymbol,
  getItems,
  updateItem,
  getBySymbol,
} from "../bot.splitshort";
import { getItem } from "../bot.mint";

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
    nextBuy: null,
    growth: [],
  });
  logger.info("cmd additem");
  return;
};

const remove = async (options: OptionValues) => {
  const { symbol } = options;
  removeSymbol(symbol);
};

const updatePurchase = async (options: OptionValues) => {
  const { symbol, usd, activate } = options;
  const item = await getBySymbol(symbol);
  await updateItem({
    ...item,
    purchaseUsd: usd,
    nextPurchaseBelow: null,
    nextBuy: {
      activate,
    },
    nextAction: "PURCHASE",
    nextSell: null,
  });
  logger.info("success", { symbol, usd, activate });
};

const updateActivate = async (options: OptionValues) => {
  const { symbol, activateSell } = options;
  const item = await getBySymbol(symbol);
  await updateItem({
    ...item,
    nextSell: {
      ...item.nextSell,
      activate: activateSell,
    },
  });
  logger.info("success", { symbol, activateSell });
};

const get = async () => {
  const items = await getItems();
  const prices = await getAllPrices();
  const columns = [
    "ID",
    "Symbol",
    "USD",
    "Next Action",
    "S. Activate",
    "S. Below",
    "P. Activate",
    "P. Above",
    "Price",
    "Growth",
  ];

  const data = map(items, (item) => {
    return [
      item.id,
      item.symbol,
      item.purchaseUsd || "-",
      item.nextAction,
      (item.nextSell && item.nextSell.activate) || "-",
      (item.nextSell && item.nextSell.below) || "-",
      (item.nextBuy && item.nextBuy.activate) || "-",
      (item.nextBuy && item.nextBuy.above) || "-",
      prices[item.symbol],
      item.growth,
    ];
  });

  console.log(table([columns, ...data]));
};

export default { add, remove, get, updateActivate, updatePurchase };
