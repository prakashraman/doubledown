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

// bot:mint
program
  .command("bot:mint:get")
  .description("display the list of active mint items")
  .action(actions.botMint.get);
program
  .command("bot:mint:add")
  .requiredOption("-s, --symbol <string>", "symbol")
  .requiredOption("-u, --usd <float>", "key usd amount", parseFloat)
  .action(actions.botMint.add);
program
  .command("bot:mint:shift_rally_price")
  .requiredOption("--id <string>", "ID of the item")
  .option("-rp, --rallyprice <float>", "New rally price", parseFloat)
  .description("Adjust the rally price of a particular item")
  .action(actions.botMint.shiftRally);
program
  .command("bot:mint:force_checkin")
  .requiredOption("--id <string>", "ID of the item")
  .description("Forces the item to checkin")
  .action(actions.botMint.forceCheckin);
program
  .command("bot:mint:remove")
  .requiredOption("--id <string>", "ID of the item to be removed")
  .description("remove an item from the mill")
  .action(actions.botMint.remove);

// bot.splitshort
program
  .command("bot:splitshort:get")
  .description("display the list of splitshort")
  .action(actions.botSplitshort.get);
program
  .command("bot:splitshort:add")
  .requiredOption("-s, --symbol <string>", "Symbol")
  .requiredOption("-a, --activateSell <float>", "Sell activate usd", parseFloat)
  .description("Add the symbol into the fold")
  .action(actions.botSplitshort.add);
program
  .command("bot:splitshort:remove")
  .requiredOption("-s, --symbol <string>", "Symbol")
  .description("Remove a symbol")
  .action(actions.botSplitshort.remove);

program.parse(process.argv);
