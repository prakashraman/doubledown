import { createClient } from "redis";
import { RedisClientType } from "redis/dist/lib/client";

import { logger } from "./init";

/**
 * The connection will try to reconnect every 3s and stop after 3 tries
 *
 * @constant RedisClient
 */
const client = createClient({
  socket: {
    reconnectStrategy: (count) => {
      logger.info("retry", { count });

      if (count > 3) {
        const msg = "unable to connect. Not going to retry anymore.";
        logger.error(msg, { count });
        return new Error(msg);
      }

      return 3000;
    },
  },
});

/**
 * Checks for an error and logs it
 *
 * @function
 */
client.on("error", (err) => {
  logger.error("unable to connect to redis", { err });
});

/**
 * Get the redis client
 *
 * This function attempts to connect to the client and return the client
 *
 * @returns RedisClientType
 */
const getClient = async (): Promise<RedisClientType> => {
  if (client.isOpen) return client;

  logger.info("attepting to connect redis client");

  await client.connect();
  return client;
};

export { getClient };
