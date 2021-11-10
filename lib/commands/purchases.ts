import { logger } from "../init";

/**
 * Prints the purhcase
 *
 * @param {string} id
 */
const get = (id: string) => {
  logger.info("printing", { id });
};

/**
 * Updates the sellAt of a particular purchase based on what the model sell
 * percentage is set to
 *
 * @param {string} id
 */
// const updateSellAt = async (id: string) => {};

export default { get };
