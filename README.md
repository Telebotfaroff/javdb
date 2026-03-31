# JAVDB

A modern movie database app (JAV-focused) with a rich UI, search engine, and Telegram integration. Includes data scraping and media metadata features.

## 🚀 Features

- Search by ID, title, actress, and studio
- Detailed movie metadata (cover, release date, actress, studio, runtime, plot, genres)
- Streaming links from multiple providers (MissAV, Jable, SupJav, JavHD, JavMost, JavBangers, JavSeen)
- Telegram bot support for auto-posting and notifications
- Actresses tracking and profile picture management
- Auto-post scheduler and Firestore settings
- Responsive UI with light/dark mode and compact list view

## 🧩 Architecture


## 📦 Requirements

- Node.js 18+
- npm
- Firebase project with Firestore configured
- Telegram bot token (via BotFather)
- Optional: BotLog token for logging

## ⚙️ Setup

1. Clone repo

```bash
git clone https://github.com/Imtiaz9800/javdb.git
cd javdb
```

2. Install dependencies

```bash
npm install
```

3. Create `.env` (or set in config) with Firestore credentials

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

4. Start app

```bash
npm run dev
```

## 🔧 Telegram bot setup

- Create bot with @BotFather
- Save bot token in Settings view (`botLogToken`, `telegramBotToken`, `telegramChannelId`)
- Ensure only one running instance (polling mode gives 409 on concurrent runs)

### Bot debugging tips

- `ETELEGRAM 409 Conflict`: stop other instances or use webhook approach.
- App now handles polling errors and auto-stops on repeated conflicts.

## 🧪 How to run tests

(If tests are added, provide commands here)

## 📁 Key files

- `src/server/bot/index.ts`: bot lifecycle (start/stop, polling error recovery)
- `src/server/scraper/index.ts`: streaming link scrapers and metadata extraction
- `src/components/HomeView.tsx`: search UI, cards, results, actions
- `src/App.tsx`: main app logic, sidebar state, views, API actions

## 🛠️ Customization

- Add/remove stream providers in `fetchMovieMetadata` or `fetchRealStreamingLinks`
- Modify card styles in `HomeView` and global styles in `index.css`
- Add new routes in `App.tsx` and corresponding view components

## 📝 Notes

- `index.html` must have proper script tags; avoid escaped sequences like `<\/script>` inside a literal string.
- No `jav.guru` currently searched.
- MissAV uses `missav.ws`; fallback to `.com` if needed.

## 💡 Contributions

PRs and issues are welcome. Please test any scraping changes against live site updates.


