import { WebClient } from "@slack/web-api";
import CONFIG from "./config";

const web = new WebClient(CONFIG.SLACK_TOKEN);

const sendMessage = async (m: string) => {
  await web.chat.postMessage({
    text: m,
    channel: "C01M0T095HU",
  });
};

export { sendMessage };
