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

  private startBot() {
    if (this.bot) {
      this.bot.stopPolling();
    }

    if (!this.token) return;

    console.log("Starting Telegram Bot...");
    this.bot = new TelegramBot(this.token, { polling: true });

    registerCommands(this);
    registerCallbacks(this);
  }
}
