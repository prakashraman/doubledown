import { Command } from "commander";

// actions
import * as actions from "./lib/commands";

const program = new Command();

/**
 * Manage purchases
 *
 * - "purchases:list" list all purchases purhcases
 * - "purchases:get" return a particular purchase
 * - "purchases:updateSellAt" updates the sellAtPurhcases based on the model
 */

const CMD_PURCHASE = "purchases";
program.command(`${CMD_PURCHASE}`).description("manage purchases");
program.command(`${CMD_PURCHASE}:list`).description("list all the purchases");
program
  .command(`${CMD_PURCHASE}:get <id>`)
  .description("retrieve a purchase")
  .action(actions.purchaseGet);

program.parse(process.argv);
