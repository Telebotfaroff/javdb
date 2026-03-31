import TelegramBot from "node-telegram-bot-api";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { registerCommands } from "./commands";
import { registerCallbacks } from "./callbacks";
import { AutopostManager } from "./autopost";

export class TelegramBotController {
  public bot: TelegramBot | null = null;
  public token: string | null = null;
  public channelId: string | null = null;
  public botLogToken: string | null = null;
  public autopostManager: AutopostManager;

  constructor() {
    this.autopostManager = new AutopostManager(this);
    this.init();
  }

  private init() {
    onSnapshot(doc(db, "settings", "config"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const newToken = data.telegramBotToken;
        this.channelId = data.telegramChannelId;
        this.botLogToken = data.botLogToken;

        if (newToken && newToken !== this.token) {
          this.token = newToken;
          this.startBot();
        }
      }
    });
  }

  private async startBot() {
    if (this.bot) {
      console.log("Stopping existing bot instance before restart...");
      await this.bot.stopPolling();
      this.bot = null;
      // Wait a moment to ensure Telegram releases the long-polling connection
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!this.token) return;

    console.log("Starting Telegram Bot...");
    this.bot = new TelegramBot(this.token, { polling: true });

    this.bot.on("polling_error", (error) => {
      console.error("Telegram polling_error", error);
      if (error.code === "ETELEGRAM" && error.message?.includes("409")) {
        console.warn("Telegram bot conflict detected: stopping current poller.");
        this.bot?.stopPolling();
        this.bot = null;
      }
    });

    registerCommands(this);
    registerCallbacks(this);
  }
}
