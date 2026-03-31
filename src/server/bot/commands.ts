import { TelegramBotController } from "./index";
import { fetchSearch, fetchMovieMetadata, fetchActressDetails } from "../scraper/index";
import { db } from "../../firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

export function registerCommands(controller: TelegramBotController) {
  const bot = controller.bot!;

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
      "👋 Welcome to JAVDB Bot Control!\n\n" +
      "Available commands:\n" +
      "/search <query> - Search for movies\n" +
      "/actress <name> - Search for an actress\n" +
      "/studio <name> - Search for a studio\n" +
      "/actresslist - List tracked actresses\n" +
      "/notfound - List not found IDs\n" +
      "/details <url> - View movie details\n" +
      "/post <id> - Post a specific ID directly\n" +
      "/autopost <query> <mode> <start> <end/padding> - Start autopost\n" +
      "/stop - Stop current autopost\n" +
      "/status - Check bot status\n" +
      "/settings - View current settings\n" +
      "/help - Show this help message"
    );
  });

  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, 
      "📖 Commands:\n" +
      "/search <query> - Search movies\n" +
      "/actress <name> - Search actress\n" +
      "/studio <name> - Search studio\n" +
      "/actresslist - List tracked actresses\n" +
      "/notfound - List not found IDs\n" +
      "/details <url> - View details\n" +
      "/post <id> - Post specific ID\n" +
      "/autopost <query> <mode> <start> <end/padding>\n" +
      "   Modes: page, sequential, range\n" +
      "   Example: /autopost STAR page 1 5\n" +
      "   Example: /autopost STAR range 1 100 3\n" +
      "/stop - Stop autopost\n" +
      "/status - Bot status\n" +
      "/settings - View settings"
    );
  });

  bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
      "🤖 Bot Status:\n\n" +
      `Autoposting: ${controller.autopostManager.isAutoposting ? "✅ Running" : "💤 Idle"}\n` +
      `Connected to Channel: ${controller.channelId ? "✅ Yes" : "❌ No"}`
    );
  });

  bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    if (controller.autopostManager.isAutoposting) {
      controller.autopostManager.stopAutopostRequested = true;
      bot.sendMessage(chatId, "🛑 Stopping autopost... Please wait for current task to finish.");
    } else {
      bot.sendMessage(chatId, "💤 No autopost is currently running.");
    }
  });

  bot.onText(/\/search (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const queryStr = match?.[1];
    if (!queryStr) return;

    bot.sendMessage(chatId, `🔍 Searching for: ${queryStr}...`);
    try {
      const results = await fetchSearch(queryStr, 'movie', 1);
      if (results.length === 0) {
        bot.sendMessage(chatId, "❌ No movies found.");
        return;
      }

      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎥 View Results", callback_data: `lmov:${queryStr.substring(0, 35)}:1` }]
          ]
        }
      };
      bot.sendMessage(chatId, `✅ Found ${results.length} movies for "${queryStr}". Click below to view them.`, opts);
    } catch (err) {
      bot.sendMessage(chatId, "❌ Error during search.");
    }
  });

  bot.onText(/\/actress (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const name = match?.[1];
    if (!name) return;

    bot.sendMessage(chatId, `🔍 Searching for actress: ${name}...`);
    try {
      const details = await fetchActressDetails(name);
      if (!details) {
        bot.sendMessage(chatId, "❌ Actress not found.");
        return;
      }

      const opts = {
        caption: `👤 ${details.name}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎥 View Movies", callback_data: `lmov:${details.name.substring(0, 35)}:1` }]
          ]
        }
      };
      if (details.profilePic) {
        bot.sendPhoto(chatId, details.profilePic, opts);
      } else {
        bot.sendMessage(chatId, `👤 ${details.name}`, opts);
      }
    } catch (err) {
      bot.sendMessage(chatId, "❌ Error fetching actress details.");
    }
  });

  bot.onText(/\/studio (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const name = match?.[1];
    if (!name) return;

    bot.sendMessage(chatId, `🔍 Searching for studio: ${name}...`);
    try {
      const results = await fetchSearch(name, 'movie', 1);
      if (results.length === 0) {
        bot.sendMessage(chatId, "❌ No movies found for this studio.");
        return;
      }
      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎥 View Movies", callback_data: `lmov:${name.substring(0, 35)}:1` }]
          ]
        }
      };
      bot.sendMessage(chatId, `✅ Found ${results.length} movies for studio "${name}". Click below to view them.`, opts);
    } catch (err) {
      bot.sendMessage(chatId, "❌ Error fetching studio movies.");
    }
  });

  bot.onText(/\/actresslist/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const q = query(collection(db, "actresses"), orderBy("name"));
      const snapshot = await getDocs(q);
      const actresses: string[] = [];
      snapshot.forEach(doc => actresses.push(doc.data().name));

      if (actresses.length === 0) {
        bot.sendMessage(chatId, "📁 No actresses tracked yet.");
        return;
      }

      const list = actresses.join("\n");
      bot.sendMessage(chatId, `👥 Tracked Actresses (${actresses.length}):\n\n${list.substring(0, 4000)}`);
    } catch (err) {
      bot.sendMessage(chatId, "❌ Error fetching actress list.");
    }
  });

  bot.onText(/\/notfound/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const q = query(collection(db, "notFound"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const items: any[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));

      if (items.length === 0) {
        bot.sendMessage(chatId, "✅ No missing IDs!");
        return;
      }

      bot.sendMessage(chatId, `⚠️ Not Found IDs (${items.length}):`);
      for (const item of items.slice(0, 10)) {
        const opts = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🔄 Retry", callback_data: `rnf:${item.code.substring(0, 50)}` },
                { text: "🗑 Delete", callback_data: `dnf:${item.id}` }
              ]
            ]
          }
        };
        bot.sendMessage(chatId, `🆔 ${item.code}\n❓ Query: ${item.query}`, opts);
      }
    } catch (err) {
      bot.sendMessage(chatId, "❌ Error fetching not found list.");
    }
  });

  bot.onText(/\/autopost (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const params = match?.[1].split(" ");
    if (!params || params.length < 3) {
      bot.sendMessage(chatId, "❌ Invalid format. Use: /autopost <query> <mode> <start> <end/padding>");
      return;
    }

    if (controller.autopostManager.isAutoposting) {
      bot.sendMessage(chatId, "⚠️ An autopost is already running.");
      return;
    }

    const [queryStr, mode, start, extra] = params;
    const startNum = parseInt(start);
    const extraNum = parseInt(extra);

    if (isNaN(startNum)) {
      bot.sendMessage(chatId, "❌ Start number must be a number.");
      return;
    }

    bot.sendMessage(chatId, `🚀 Starting autopost for ${queryStr} (${mode})...`);
    controller.autopostManager.runAutopost(chatId, { query: queryStr, mode, startNum, extraNum });
  });

  bot.onText(/\/details (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match?.[1];
    if (!url) return;

    bot.sendMessage(chatId, "🔍 Fetching details...");
    try {
      const details = await fetchMovieMetadata(url);
      let text = `🎬 ${details.title}\n\n`;
      text += `📀 DVD ID: ${details.dvdId}\n`;
      text += `📅 Released: ${details.releaseDate}\n`;
      text += `🏢 Studio: ${details.studio}\n`;
      text += `👥 Actress: ${details.actress}\n`;
      text += `🎥 Director: ${details.director}\n\n`;
      text += `🎭 Genres: ${details.genres?.join(", ")}\n\n`;
      
      if (details.streamingLinks && details.streamingLinks.length > 0) {
        text += `📺 Watch Online:\n`;
        details.streamingLinks.forEach((link: any) => {
          text += `• <a href="${link.url}">${link.site}</a>\n`;
        });
        text += `\n`;
      }
      
      text += `📝 Plot: ${details.plot?.substring(0, 500)}...`;

      const opts: any = {
        caption: text.substring(0, 1024),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: "📤 Post to Channel", callback_data: `pst:${details.dvdId.substring(0, 50)}` }]
          ]
        }
      };

      if (details.poster) {
        bot.sendPhoto(chatId, details.poster, opts);
      } else {
        bot.sendMessage(chatId, text, opts);
      }
    } catch (err) {
      bot.sendMessage(chatId, "❌ Error fetching details.");
    }
  });

  bot.onText(/\/post (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const id = match?.[1];
    if (!id) return;

    bot.sendMessage(chatId, `🔍 Searching for ID: ${id}...`);
    try {
      const results = await fetchSearch(id, 'movie', 1);
      const found = results.find(m => m.code.toUpperCase().includes(id.toUpperCase()));
      if (found) {
        bot.sendMessage(chatId, `✅ Found ${id}! Posting to channel...`);
        const details = await fetchMovieMetadata(found.link);
        await controller.autopostManager.postToChannel(details);
        bot.sendMessage(chatId, `✅ Posted ${details.dvdId} to channel!`);
      } else {
        bot.sendMessage(chatId, `❌ ${id} not found.`);
      }
    } catch (err) {
      bot.sendMessage(chatId, "❌ Error during post.");
    }
  });

  bot.onText(/\/settings/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
      "⚙️ Current Settings:\n\n" +
      `Channel ID: ${controller.channelId || "Not set"}\n` +
      `Bot Log Token: ${controller.botLogToken ? "✅ Set" : "❌ Not set"}\n` +
      `Bot Token: ${controller.token ? "✅ Set" : "❌ Not set"}`
    );
  });
}
