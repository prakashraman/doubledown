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

/**
 * Runs the process at the frequency mentioned in the cron
 *
 * Go through the "run" method to figure things out.
 */
const bot = new CronJob("*/10 * * * * *", run);

/**
 * Runs the collective bot every 10 seconds (or see cron spec below)
 *
 * Go through the "collective.run" method to figure things out
 */
const botCollective = new CronJob("*/10 * * * * *", collective.run);

/**
 * Runs the mint bot every 20 seconds (or see cron spec below)
 *
 * Go through the "mint.run" method to figure things out
 */
const botMint = new CronJob("*/20 * * * * *", mint.run);

/**
 * Update the account balances
 *
 * Runs every minutes and updates the database with all the balances
 */
const balances = new CronJob("* * * * *", updateBalances);

/**
 * Runs the mint bot every 20 seconds (or see cron spec below)
 *
 * Go through the "splitshort.run" method to figure things out
 */
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
