/**
 * A very basic page to show the current status of the cache
 *
 * Support 2 basic routes
 *
 * - / healthcheck
 * - /stats coin and purchase information
 */
import * as path from "path";
import express from "express";

import { logger } from "./lib/init";
import { prices } from "./lib/web/model";

/**
 * Port
 *
 * This ideally should be set by heroku
 */
const PORT = process.env.PORT || 3000;

const app = express();

/**
 * Sets the template engine:
 *
 * Engine: hbs
 */
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "lib/web/views"));

/** --------- ROUTES ------------ */
app.get("/", (_req, res) => {
  res.json({ ok: true, now: new Date() });
});

app.get("/stats", async (_req, res) => {
  res.render("stats", { prices: await prices() });
});

/** ------------ LISTEN ----------- */
app.listen(PORT, () => {
  logger.info(`listening at http://localhost:${PORT}`, { PORT });
});
