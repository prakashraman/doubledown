import { createLogger, transports } from "winston";

/**
 * The main logger
 */
export const logger = createLogger({
  transports: [new transports.Console()],
});
