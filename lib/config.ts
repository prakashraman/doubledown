type TrackedSymbols =
  | "ANKRUSDT"
  | "HOTUSDT"
  | "DOTUSDT"
  | "SOLUSDT"
  | "ETHUSDT"
  | "CHRUSDT"
  | "MATICUSDT"
  | "FILUSDT";

const MODEL_PRICES: Record<TrackedSymbols, number> = {
  ANKRUSDT: 0.167,
  HOTUSDT: 0.0126,
  DOTUSDT: 38.06,
  SOLUSDT: 211.0,
  ETHUSDT: 4517.0,
  CHRUSDT: 1.17,
  MATICUSDT: 1.73,
  FILUSDT: 56.2,
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
