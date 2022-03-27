require("newrelic");

import { CronJob } from "cron";

import { run } from "./lib/bot";
import collective from "./lib/bot.collective";
import mint from "./lib/bot.mint";
import splitshort from "./lib/bot.splitshort";
import { logger } from "./lib/init";
import { updateBalances } from "./lib/balance";
import * as db from "./lib/db";

logger.info("Starting worker ...", { time: new Date() });

const bot = new CronJob("*/10 * * * * *", run);
const botCollective = new CronJob("*/10 * * * * *", collective.run);
const botMint = new CronJob("*/20 * * * * *", mint.run);
const balances = new CronJob("* * * * *", updateBalances);
const botSplitshort = new CronJob("*/20 * * * * *", splitshort.run);

/**
 * Meant to check the application connections before starting the job
 *
 * - Checks the database connectivity
 */
const check = async () => {
  const client = await db.getClient();
  if (!client.isOpen) {
    logger.error("check failed", { db: "no" });
  }

  balances.start();
  // bot.start();
  // botCollective.start();
  // botMint.start();
  botSplitshort.start();
};

(() => {
  check();
})();
