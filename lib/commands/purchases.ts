import { logger } from "../init";

/**
 * Prints the purhcase
 *
 * @param {string} id
 */
const get = (id: string) => {
  logger.info("printing", { id });
};

export default { get };
