import { CronJob } from "cron";

import { run } from "./lib/bot";
import { logger } from "./lib/init";

/**
 * Runs the process at the frequency mentioned in the cron
 *
 * Go through the "run" method to figure things out.
 */
const job = new CronJob("*/5 * * * * *", run, () => {
  logger.info("Thank you! Come again");
});

job.start();
