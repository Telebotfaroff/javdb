import { TelegramBotController } from "./index";
import { fetchSearch, fetchMovieMetadata } from "../scraper/index";
import { db } from "../../firebase";
import { doc, deleteDoc } from "firebase/firestore";

export function registerCallbacks(controller: TelegramBotController) {
  const bot = controller.bot!;

  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;
    if (!chatId || !data) return;

    if (data.startsWith("det:")) {
      const code = data.replace("det:", "");
      bot.answerCallbackQuery(query.id, { text: "Searching for movie..." });
      try {
        const results = await fetchSearch(code, 'movie', 1);
        const found = results.find(m => m.code.toUpperCase().includes(code.toUpperCase()));
        if (!found) {
          bot.sendMessage(chatId, `❌ Could not find details for ${code}.`);
          return;
        }
        const details = await fetchMovieMetadata(found.link);
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

        if (details.poster) {
          bot.sendPhoto(chatId, details.poster, { caption: text.substring(0, 1024), parse_mode: 'HTML' });
        } else {
          bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        }
      } catch (err) {
        bot.sendMessage(chatId, "❌ Error fetching details.");
      }
    } else if (data.startsWith("pst:")) {
      const code = data.replace("pst:", "");
      bot.answerCallbackQuery(query.id, { text: "Searching for movie..." });
      try {
        const results = await fetchSearch(code, 'movie', 1);
        const found = results.find(m => m.code.toUpperCase().includes(code.toUpperCase()));
        if (!found) {
          bot.sendMessage(chatId, `❌ Could not find ${code} to post.`);
          return;
        }
        const details = await fetchMovieMetadata(found.link);
        await controller.autopostManager.postToChannel(details);
        bot.sendMessage(chatId, `✅ Posted ${details.dvdId} to channel!`);
      } catch (err) {
        bot.sendMessage(chatId, "❌ Failed to post to channel.");
      }
    } else if (data.startsWith("lmov:")) {
      const parts = data.replace("lmov:", "").split(":");
      const queryStr = parts[0];
      const page = parts.length > 1 ? parseInt(parts[1]) : 1;
      
      bot.answerCallbackQuery(query.id, { text: `Fetching movies (Page ${page})...` });
      try {
        const results = await fetchSearch(queryStr, 'movie', page);
        if (results.length === 0) {
          bot.sendMessage(chatId, `❌ No movies found for "${queryStr}" on page ${page}.`);
          return;
        }

        let msg = `🎬 <b>Results for "${queryStr}" (Page ${page})</b>\n\nSelect a movie to view details:`;
        
        const inline_keyboard = [];
        
        // Add movie buttons (2 per row to save space)
        for (let i = 0; i < results.length; i += 2) {
          const row = [];
          const movie1 = results[i];
          row.push({ text: movie1.code || movie1.title?.substring(0, 20) || 'Movie', callback_data: `smov:${queryStr.substring(0, 35)}:${page}:${i}` });
          
          if (i + 1 < results.length) {
            const movie2 = results[i + 1];
            row.push({ text: movie2.code || movie2.title?.substring(0, 20) || 'Movie', callback_data: `smov:${queryStr.substring(0, 35)}:${page}:${i + 1}` });
          }
          inline_keyboard.push(row);
        }

        const pageNav = [];
        if (page > 1) {
          pageNav.push({ text: "⏪ Prev Page", callback_data: `lmov:${queryStr.substring(0, 35)}:${page - 1}` });
        }
        if (results.length >= 40) { // Assuming 40 is max per page
          pageNav.push({ text: "Next Page ⏩", callback_data: `lmov:${queryStr.substring(0, 35)}:${page + 1}` });
        }
        if (pageNav.length > 0) inline_keyboard.push(pageNav);

        const opts: any = { parse_mode: 'HTML', reply_markup: { inline_keyboard } };
        bot.sendMessage(chatId, msg, opts);
        
      } catch (err) {
        bot.sendMessage(chatId, "❌ Error fetching movies.");
      }
    } else if (data.startsWith("smov:")) {
      const parts = data.replace("smov:", "").split(":");
      const queryStr = parts[0];
      const page = parts.length > 1 ? parseInt(parts[1]) : 1;
      const index = parts.length > 2 ? parseInt(parts[2]) : 0;
      
      bot.answerCallbackQuery(query.id, { text: `Fetching result ${index + 1} (Page ${page})...` });
      try {
        const results = await fetchSearch(queryStr, 'movie', page);
        if (results.length === 0) {
          bot.sendMessage(chatId, `❌ No movies found for "${queryStr}" on page ${page}.`);
          return;
        }
        
        if (index >= results.length || index < 0) {
           bot.sendMessage(chatId, `❌ Invalid movie index.`);
           return;
        }

        const movie = results[index];
        const details = await fetchMovieMetadata(movie.link);
        
        let msg = `🎬 <b>${details.title || 'Unknown Title'}</b>\n\n`;
        msg += `🆔 <b>Code:</b> ${details.dvdId || 'Unknown'}\n`;
        msg += `📅 <b>Release:</b> ${details.releaseDate || 'Unknown'}\n`;
        msg += `⏱ <b>Runtime:</b> ${details.runtime || 'Unknown'}\n`;
        msg += `🏢 <b>Studio:</b> ${details.studio || 'Unknown'}\n`;
        if (details.actress) msg += `👩 <b>Actress:</b> ${details.actress}\n`;
        if (details.genres && details.genres.length > 0) msg += `🎭 <b>Genres:</b> ${details.genres.join(', ')}\n`;
        
        if (details.streamingLinks && details.streamingLinks.length > 0) {
          msg += `\n📺 <b>Watch Online:</b>\n`;
          details.streamingLinks.forEach(link => {
            msg += `• <a href="${link.url}">${link.site}</a>\n`;
          });
        }

        const inline_keyboard = [];
        if (details.dvdId) {
          inline_keyboard.push([
            { text: "📤 Post to Channel", callback_data: `pst:${details.dvdId.substring(0, 50)}` }
          ]);
        }

        const movieNav = [];
        if (index > 0) {
          movieNav.push({ text: "⬅️ Prev Movie", callback_data: `smov:${queryStr.substring(0, 35)}:${page}:${index - 1}` });
        }
        if (index < results.length - 1) {
          movieNav.push({ text: "Next Movie ➡️", callback_data: `smov:${queryStr.substring(0, 35)}:${page}:${index + 1}` });
        }
        if (movieNav.length > 0) inline_keyboard.push(movieNav);

        inline_keyboard.push([
          { text: "🔙 Back to List", callback_data: `lmov:${queryStr.substring(0, 35)}:${page}` }
        ]);

        const pageNav = [];
        if (page > 1) {
          pageNav.push({ text: "⏪ Prev Page", callback_data: `lmov:${queryStr.substring(0, 35)}:${page - 1}` });
        }
        if (results.length >= 40) { // Assuming 40 is max per page
          pageNav.push({ text: "Next Page ⏩", callback_data: `lmov:${queryStr.substring(0, 35)}:${page + 1}` });
        }
        if (pageNav.length > 0) inline_keyboard.push(pageNav);

        const opts: any = { parse_mode: 'HTML', reply_markup: { inline_keyboard } };
        
        if (details.poster) {
          bot.sendPhoto(chatId, details.poster, { ...opts, caption: msg.substring(0, 1024) });
        } else {
          bot.sendMessage(chatId, msg, opts);
        }
        
      } catch (err) {
        bot.sendMessage(chatId, "❌ Error fetching movies.");
      }
    } else if (data.startsWith("rnf:")) {
      const code = data.replace("rnf:", "");
      bot.answerCallbackQuery(query.id, { text: `Retrying ${code}...` });
      try {
        const results = await fetchSearch(code, 'movie', 1);
        const found = results.find(m => m.code.toUpperCase().includes(code.toUpperCase()));
        if (found) {
          bot.sendMessage(chatId, `✅ Found ${code}!`);
          const opts = {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📄 Details", callback_data: `det:${found.code.substring(0, 50)}` }, { text: "📤 Post", callback_data: `pst:${found.code.substring(0, 50)}` }]
              ]
            }
          };
          bot.sendMessage(chatId, `🎬 ${found.title}\n🆔 ${found.code}`, opts);
        } else {
          bot.sendMessage(chatId, `❌ ${code} still not found.`);
        }
      } catch (err) {
        bot.sendMessage(chatId, "❌ Error during retry.");
      }
    } else if (data.startsWith("dnf:")) {
      const id = data.replace("dnf:", "");
      bot.answerCallbackQuery(query.id, { text: "Deleting..." });
      try {
        await deleteDoc(doc(db, "notFound", id));
        bot.sendMessage(chatId, "🗑 Deleted from not found list.");
      } catch (err) {
        bot.sendMessage(chatId, "❌ Error during delete.");
      }
    }
  });
}
