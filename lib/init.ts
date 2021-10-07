import { createLogger, transports, format } from "winston";
import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";

import CONFIG from "./config";

/**
 * The main logger
 */
export const logger = createLogger({
  transports: [
    new transports.Console(),
    new LogtailTransport(new Logtail(CONFIG.LOGTAIL_SOURCE_TOKEN)),
  ],
});
