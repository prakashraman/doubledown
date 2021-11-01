import { createLogger, transports, format } from "winston";

/** The main logger */
export const logger = createLogger({
  transports: [new transports.Console()],
  format: format.combine(format.timestamp(), format.simple()),
});
