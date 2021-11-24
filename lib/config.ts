type TrackedSymbols =
  | "ANKRUSDT"
  | "HOTBUSD"
  | "HOTUSDT"
  | "DOTUSDT"
  | "SOLUSDT"
  | "ETHUSDT"
  | "CHRUSDT"
  | "MATICUSDT";

const MODEL_PRICES: Record<TrackedSymbols, number> = {
  ANKRUSDT: 0.126,
  HOTBUSD: 0.01437,
  HOTUSDT: 0.0138,
  DOTUSDT: 40.06,
  SOLUSDT: 220.0,
  ETHUSDT: 4349.0,
  CHRUSDT: 1.316,
  MATICUSDT: 1.6,
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

  BOT_COLLECTIVE_POT: 300,
};

export default CONFIG;
