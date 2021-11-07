import url from "url";
import { createClient } from "redis";
import { RedisClientType } from "redis/dist/lib/client";

import CONFIG from "./config";
import { logger } from "./init";

/**
 * Removed the "username" segment from the string. As redis rejects the
 * connection is username is present
 *
 * @param {string} s
 * @returns String
 */
const fixConnectionUrl = (s: string): string => {
  const _url = url.parse(s);
  _url.auth = `:${_url.auth.split(":")[1]}`;

  return url.format(_url);
};

/* ----------------- CONNECTION ----------------- */

/**
 * The connection will try to reconnect every 3s and stop after 3 tries
 *
 * @constant RedisClient
 */
const client = createClient({
  url: fixConnectionUrl(CONFIG.REDISTOGO_URL),

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
  console.log("unable to connect to redis log", { message: err.message });
  logger.debug("unable to connect to redis", { message: err.message });
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

  logger.info("attempting to connect redis client");

  await client.connect();
  return client;
};

/**
 * Set key in redis database
 *
 * @param {string} key
 * @param {any} value
 * @returns {Promise<string>}
 */
const set = async (key: string, value: any): Promise<string> => {
  return (await getClient()).set(key, value);
};

/**
 * Helper method which converts the "value" to JSON before storing
 *
 * @param {string} key
 * @param {any} value
 * @returns {Promise<string>}
 */
const setJSON = async (key: string, value: any): Promise<string> => {
  return set(key, JSON.stringify(value));
};

/**
 * Get a key from the redis database
 *
 * @param {string} key
 * @returns Promise
 */
const get = async (key: string): Promise<string> => {
  return (await getClient()).get(key);
};

/**
 * Helper method to parse into JSON before returning
 *
 * @param {string} key
 * @returns Promise
 */
const getJSON = async (key: string): Promise<any> => {
  return JSON.parse(await get(key));
};

export { getClient, get, set, setJSON, getJSON, fixConnectionUrl };
