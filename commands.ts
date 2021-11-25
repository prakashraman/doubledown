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
program
  .command(`${CMD_PURCHASE}:list`)
  .description("list all the purchases")
  .action(actions.purchases.list);
program
  .command(`${CMD_PURCHASE}:remove <id>`)
  .option("-a, --another", "another id")
  .description("remove a purhcase")
  .action(actions.purchases.remove);

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
  .option("-l, --latest <int>", "number of latest trades to be displayed", "10")
  .description("fetch trades for symbol")
  .action(actions.trades.get);

// bot:collective
program
  .command("bot:collective:stats")
  .description("bot collective stats")
  .action(actions.botCollective.stats);
program
  .command("bot:collective:set_sell_price")
  .argument("<price>", "price to be set", parseFloat)
  .description("set's the collective purchase sell price")
  .action(actions.botCollective.setSellPrice);

program.parse(process.argv);
