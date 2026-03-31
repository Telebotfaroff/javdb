import { Send, Loader2, Save } from 'lucide-react';

export function SettingsView({
  telegramBotToken,
  setTelegramBotToken,
  telegramChannelId,
  setTelegramChannelId,
  botLogToken,
  setBotLogToken,
  saveSettings,
  isSavingSettings,
  darkMode,
  setDarkMode,
  compactView,
  setCompactView
}: {
  telegramBotToken: string;
  setTelegramBotToken: (val: string) => void;
  telegramChannelId: string;
  setTelegramChannelId: (val: string) => void;
  botLogToken: string;
  setBotLogToken: (val: string) => void;
  saveSettings: () => void;
  isSavingSettings: boolean;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  compactView: boolean;
  setCompactView: (val: boolean) => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">Settings</h2>
      <div className="space-y-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Send size={18} className="text-primary" /> Telegram Integration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Bot Token</label>
              <input 
                type="password" 
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Channel ID</label>
              <input 
                type="text" 
                value={telegramChannelId}
                onChange={(e) => setTelegramChannelId(e.target.value)}
                placeholder="@mychannel or -100123456789"
                className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                BotLog Token <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold">Indicator: botlog</span>
              </label>
              <input 
                type="password" 
                value={botLogToken}
                onChange={(e) => setBotLogToken(e.target.value)}
                placeholder="Log Bot Token (Notifies admin 7367490186)"
                className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Create a bot via @BotFather and add it as an admin to your channel.
            </p>
            <button
              onClick={saveSettings}
              disabled={isSavingSettings}
              className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              {isSavingSettings ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Settings to Database
            </button>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="font-bold mb-4">Display Options</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">Dark Mode</span>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${darkMode ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${darkMode ? 'left-7' : 'left-1'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">Compact View</span>
              <button 
                onClick={() => setCompactView(!compactView)}
                className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${compactView ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${compactView ? 'left-7' : 'left-1'}`} />
              </button>
            </label>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="font-bold mb-4 text-destructive">Danger Zone</h3>
          <button className="w-full py-3 border border-destructive/20 text-destructive rounded-xl font-semibold hover:bg-destructive/10 transition">
            Clear Search History
          </button>
        </div>
      </div>
    </div>
  );
}
