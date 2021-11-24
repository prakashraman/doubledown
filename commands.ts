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
  .action(actions.purchases.get);

// Balances
program
  .command("balances:get")
  .description("view all the balances")
  .action(actions.balances.getAll);

// Orders
program
  .command("orders:order")
  .requiredOption("-s, --symbol <string>", "symbol")
  .requiredOption("-u, --usdt <string>", "equivalent usdt to purhcase")
  .requiredOption("-si, --side <string>", "side [BUY|SELL]")
  .description("place an order")
  .action(actions.orders.order);

// trades
program
  .command("trades:get")
  .requiredOption("-s, --symbol <string>", "symbol")
  .description("fetch trades for symbol")
  .action(actions.trades.get);

program.parse(process.argv);
