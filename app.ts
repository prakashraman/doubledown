require("newrelic");

import { CronJob } from "cron";

import { run } from "./lib/bot";
import { logger } from "./lib/init";
import * as db from "./lib/db";

logger.info("Starting worker ...", { time: new Date() });

/**
 * Runs the process at the frequency mentioned in the cron
 *
 * Go through the "run" method to figure things out.
 */
const job = new CronJob("*/10  * * * * *", run, () => {
  logger.info("Thank you! Come again");
});

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

  job.start();
};

(() => {
  check();
})();
