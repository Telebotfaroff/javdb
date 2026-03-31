import { TelegramBotController } from "./index";
import { fetchSearch } from "../scraper/index";
import { db } from "../../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export class AutopostManager {
  public isAutoposting = false;
  public stopAutopostRequested = false;
  private controller: TelegramBotController;

  constructor(controller: TelegramBotController) {
    this.controller = controller;
  }

  public async runAutopost(chatId: number, item: any) {
    this.isAutoposting = true;
    this.stopAutopostRequested = false;
    const bot = this.controller.bot!;

    try {
      if (item.mode === 'page') {
        for (let p = item.startNum; p <= (item.extraNum || 1); p++) {
          if (this.stopAutopostRequested) break;
          bot.sendMessage(chatId, `📄 Scraping page ${p}...`);
          const results = await fetchSearch(item.query, 'movie', p);
          if (results.length === 0) break;
          for (const movie of results) {
            if (this.stopAutopostRequested) break;
            await this.postToChannel(movie);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      } else if (item.mode === 'sequential') {
        let current = item.startNum;
        let consecutiveFails = 0;
        while (!this.stopAutopostRequested && consecutiveFails < 15) {
          const padded = current.toString().padStart(item.extraNum || 0, '0');
          const id = `${item.query}-${padded}`;
          const results = await fetchSearch(id, 'movie', 1);
          const found = results.find(m => m.code.toUpperCase().includes(id.toUpperCase()));
          if (found) {
            consecutiveFails = 0;
            await this.postToChannel(found);
          } else {
            consecutiveFails++;
            await setDoc(doc(db, "notFound", id), { code: id, query: item.query, createdAt: serverTimestamp() });
          }
          current++;
          await new Promise(r => setTimeout(r, 2000));
        }
      } else if (item.mode === 'range') {
        const start = item.startNum;
        const end = item.extraNum || start;
        for (let current = start; current <= end; current++) {
          if (this.stopAutopostRequested) break;
          const padded = current.toString().padStart(3, '0'); // Default padding 3 for range
          const id = `${item.query}-${padded}`;
          const results = await fetchSearch(id, 'movie', 1);
          const found = results.find(m => m.code.toUpperCase().includes(id.toUpperCase()));
          if (found) {
            await this.postToChannel(found);
          } else {
            await setDoc(doc(db, "notFound", id), { code: id, query: item.query, createdAt: serverTimestamp() });
          }
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      bot.sendMessage(chatId, this.stopAutopostRequested ? "🛑 Autopost stopped." : "✅ Autopost finished!");
    } catch (err) {
      bot.sendMessage(chatId, "❌ Autopost error.");
    } finally {
      this.isAutoposting = false;
      this.stopAutopostRequested = false;
    }
  }

  public async postToChannel(m: any) {
    if (!this.controller.token || !this.controller.channelId) return;

    // Track actresses and studios
    if (m.actress) {
      const names = m.actress.split(/[,\/&|]|\s+and\s+/i).map((n: string) => n.trim()).filter(Boolean);
      for (const name of names) {
        setDoc(doc(db, 'actresses', name), { name, createdAt: serverTimestamp() }, { merge: true }).catch(() => {});
      }
    }
    if (m.studio) {
      const names = m.studio.split(/[,\/&|]|\s+and\s+/i).map((n: string) => n.trim()).filter(Boolean);
      for (const name of names) {
        setDoc(doc(db, 'studios', name), { name, createdAt: serverTimestamp() }, { merge: true }).catch(() => {});
      }
    }

    const generateCaption = (m: any, includeActress: boolean) => {
      const dId = m.dvdId || m.code;
      const dPrefix = dId.split('-')[0].replace(/[0-9]/g, '').toUpperCase();
      const actressList = m.actress ? m.actress.split(/[,\/&|]|\s+and\s+/i).map((a: string) => a.trim()).filter(Boolean) : [];
      const displayActresses = actressList.slice(0, 5).join(', ');
      const actressHashtags = includeActress ? actressList.slice(0, 5).map((a: string) => `#${a.toLowerCase().replace(/\s+/g, '')}`).join(' ') : '';
      const hTags = [`#${dPrefix}`, actressHashtags].filter(Boolean).join(' ');

      let caption = `🎬 ${m.title} ${displayActresses}\n\n`;
      caption += `📀 IDs: DVD: ${dId}${m.contentId ? ` | Content: ${m.contentId}` : ''}\n\n`;
      caption += `📅 ${m.releaseDate} | ⏱ ${m.runtime} | 🏢 ${m.studio}\n\n`;
      caption += `🎥 Director: ${m.director || 'N/A'}\n`;
      if (includeActress && displayActresses) {
        caption += `👥 Actresses: ${displayActresses}\n`;
      }
      caption += `\n🎭 Genres: ${m.genres?.join(', ') || 'N/A'}\n`;
      
      if (m.streamingLinks && m.streamingLinks.length > 0) {
        caption += `\n📺 Watch Online:\n`;
        m.streamingLinks.forEach((link: any) => {
          caption += `• <a href="${link.url}">${link.site}</a>\n`;
        });
      }
      
      caption += `\n🔖 Hashtags: ${hTags}`;
      return caption;
    };

    let text = generateCaption(m, true);
    if (text.length > 1024) text = generateCaption(m, false);
    if (text.length > 1024) text = text.substring(0, 1021) + '...';

    const url = `https://api.telegram.org/bot${this.controller.token}/sendPhoto`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.controller.channelId,
        photo: m.poster,
        caption: text,
        parse_mode: 'HTML'
      })
    });

    if (this.controller.botLogToken) {
      await fetch(`https://api.telegram.org/bot${this.controller.botLogToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '7367490186',
          text: `✅ <b>Success:</b> Posted ${m.dvdId} to Telegram.`,
          parse_mode: 'HTML'
        })
      });
    }
  }
}
