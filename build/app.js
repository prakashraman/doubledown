"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cron_1 = require("cron");
var bot_1 = require("./lib/bot");
var init_1 = require("./lib/init");
/**
 * Runs the process at the frequency mentioned in the cron
 *
 * Go through the "run" method to figure things out.
 */
var job = new cron_1.CronJob("*/5 * * * * *", bot_1.run, function () {
    init_1.logger.info("Thank you! Come again");
});
job.start();
//# sourceMappingURL=app.js.map