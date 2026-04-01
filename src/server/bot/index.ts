import * as Puregram from "puregram";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { registerCommands } from "./commands";
import { registerCallbacks } from "./callbacks";
import { AutopostManager } from "./autopost";

class TelegramBotAdapter {
  private puregram: any;
  public updates: any;
  public telegram: any;

  constructor(public controller: TelegramBotController, puregram: any) {
    this.puregram = puregram;
    this.updates = puregram.updates;
    this.telegram = puregram.telegram;
  }

  onText(regex: RegExp, handler: (msg: any, match?: RegExpMatchArray | null) => void | Promise<void>) {
    this.updates.on("message", async (ctx: any) => {
      const msg = ctx.message;
      const text = msg?.text;
      if (!text) return;
      const match = text.match(regex);
      if (!match) return;
      await handler(msg, match);
    });
  }

  on(event: string, handler: (data: any) => void | Promise<void>) {
    if (event === "callback_query") {
      this.updates.on("callback_query", async (ctx: any) => {
        const query = ctx.callbackQuery;
        if (!query) return;
        await handler(query);
      });
      return;
    }
    this.updates.on(event, handler);
  }

  sendMessage(chatId: number, text: string, opts?: any) {
    return this.telegram.sendMessage(chatId, text, opts);
  }

  sendPhoto(chatId: number, photo: string, opts?: any) {
    return this.telegram.sendPhoto(chatId, photo, opts);
  }

  answerCallbackQuery(callbackQueryId: string, opts?: any) {
    return this.telegram.answerCallbackQuery(callbackQueryId, opts);
  }

  async stopPolling() {
    if (this.updates?.stopPolling) {
      return this.updates.stopPolling();
    }
  }
}

export class TelegramBotController {
  public bot: TelegramBotAdapter | null = null;
  public token: string | null = null;
  public channelId: string | null = null;
  public botLogToken: string | null = null;
  public autopostManager: AutopostManager;
  private puregram: any = null;

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
      this.puregram = null;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!this.token) return;

    console.log("Starting Telegram Bot...");
    const puregram: any = new Puregram.Telegram({ token: this.token });
    this.puregram = puregram;
    this.bot = new TelegramBotAdapter(this, puregram);

    registerCommands(this);
    registerCallbacks(this);

    if (puregram.updates?.startPolling) {
      await puregram.updates.startPolling();
    } else {
      console.warn("Telegram polling could not be started: puregram polling API not found.");
    }
  }
}
