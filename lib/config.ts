type TrackedSymbols =
  | "HOTUSDT"
  | "BTCUSDT"
  | "DOTUSDT"
  | "SOLUSDT"
  | "ETHUSDT"
  | "CHRUSDT"
  | "MATICUSDT"
  | "FILUSDT";

const MODEL_PRICES: Record<TrackedSymbols, number> = {
  BTCUSDT: 57200,
  HOTUSDT: 0.01219,
  DOTUSDT: 36.59,
  SOLUSDT: 234.0,
  ETHUSDT: 4600.0,
  CHRUSDT: 0.889,
  MATICUSDT: 1.73,
  FILUSDT: 53.16,
};

const CONFIG = {
  LOGTAIL_SOURCE_TOKEN: process.env.LOGTAIL_SOURCE_TOKEN,
  BINANCE_API_KEY: process.env.BINANCE_API_KEY,
  BINANCE_API_SECRET: process.env.BINANCE_API_SECRET,
  REDISTOGO_URL: process.env.REDISTOGO_URL,
  SLACK_TOKEN: process.env.SLACK_TOKEN,

  KEY_PENDING_PURCHASES: "pending:purchases",
  KEY_PURCHASES: "inplay:purchases",
  KEY_BALANCES: "balances",
  KEY_MODEL_COLLECTIVE: "model:collective",

  MODEL_PRICES,

  BOT_COLLECTIVE_POT: 500,
};

export default CONFIG;
