require("newrelic");

import { CronJob } from "cron";

import { run } from "./lib/bot";
import { logger } from "./lib/init";

/**
 * Runs the process at the frequency mentioned in the cron
 *
 * Go through the "run" method to figure things out.
 */

logger.info("Starting worker ...", { time: new Date() });

// const job = new CronJob("*/3  * * * * *", run, () => {
//   logger.info("Thank you! Come again");
// });

// job.start();

run();
