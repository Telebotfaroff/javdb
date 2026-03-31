import { useState, useRef } from 'react';
import { Zap, UserPlus, Play, Pause, Hash, Trash2, Loader2 } from 'lucide-react';
import { Movie, MovieDetails, QueueItem } from '../types';

export function AutopostView({ handleSearch, sendToTelegram, tgStatus, addActresses, addStudios, sendLogToBotLog, saveNotFound }: { 
  handleSearch: (q: string, p: number, t?: any) => Promise<any>, 
  sendToTelegram: (m: any) => Promise<void>,
  tgStatus: any,
  addActresses: (actressStr?: string, movie?: Movie | MovieDetails) => Promise<void>,
  addStudios: (studioStr?: string) => Promise<void>,
  sendLogToBotLog: (msg: string) => Promise<void>,
  saveNotFound: (code: string, query: string) => Promise<void>
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'page' | 'sequential' | 'range'>('page');
  const [startNum, setStartNum] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [rangeEndNum, setRangeEndNum] = useState(100);
  const [padding, setPadding] = useState(3);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const postingRef = useRef(false);
  const [currentAction, setCurrentAction] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  const addToQueue = () => {
    if (!query) return;
    if (queue.length >= 5) {
      addLog('⚠️ Queue is full (max 5 items).');
      return;
    }

    const newItem: QueueItem = {
      id: Math.random().toString(36).substr(2, 9),
      mode,
      query,
      startNum,
      endPage: mode === 'page' ? endPage : undefined,
      padding: mode !== 'page' ? padding : undefined,
      rangeEndNum: mode === 'range' ? rangeEndNum : undefined,
    };

    setQueue(prev => [...prev, newItem]);
    addLog(`📥 Added to queue: ${query} (${mode} mode)`);
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const startAutopost = async () => {
    if (queue.length === 0 && !query) return;
    
    let currentQueue = [...queue];
    if (currentQueue.length === 0 && query) {
      // If queue is empty but query is set, add current settings to a temporary queue
      currentQueue = [{
        id: 'temp',
        mode,
        query,
        startNum,
        endPage: mode === 'page' ? endPage : undefined,
        padding: mode !== 'page' ? padding : undefined,
        rangeEndNum: mode === 'range' ? rangeEndNum : undefined,
      }];
    }

    setIsPosting(true);
    postingRef.current = true;
    setLogs([]);
    
    try {
      let totalPostedOverall = 0;

      for (let qIdx = 0; qIdx < currentQueue.length; qIdx++) {
        if (!postingRef.current) break;
        const item = currentQueue[qIdx];
        const startMsg = `🚀 Starting task ${qIdx + 1}/${currentQueue.length}: ${item.query} (${item.mode} mode)`;
        addLog(startMsg);
        await sendLogToBotLog(startMsg);

        let totalPostedTask = 0;

        if (item.mode === 'page') {
          for (let p = item.startNum; p <= (item.endPage || 1); p++) {
            if (!postingRef.current) break;
            addLog(`📄 [${item.query}] Scraping page ${p}...`);
            setCurrentAction(`Scraping page ${p}...`);
            
            const response = await fetch(`/api/search?q=${encodeURIComponent(item.query)}&type=movie&page=${p}`);
            const movies: Movie[] = await response.json();
            
            if (movies.length === 0) {
              addLog(`⚠️ [${item.query}] No movies found on page ${p}.`);
              break;
            }

            setProgress({ current: 0, total: movies.length });
            
            for (let i = 0; i < movies.length; i++) {
              if (!postingRef.current) break;
              const movie = movies[i];
              setProgress({ current: i + 1, total: movies.length });
              setCurrentAction(`Posting ${movie.code}...`);
              addLog(`📤 [${item.query}] Posting ${movie.code}: ${movie.title}`);
              
              await sendToTelegram(movie);
              addActresses(movie.actress, movie);
              addStudios(movie.studio);
              totalPostedTask++;
              totalPostedOverall++;
              
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        } else if (item.mode === 'sequential') {
          let current = item.startNum;
          let consecutiveFails = 0;
          const MAX_CONSECUTIVE_FAILS = 15;

          while (postingRef.current) {
            const padded = current.toString().padStart(item.padding || 0, '0');
            const id = `${item.query}-${padded}`;
            setCurrentAction(`Searching ${id}...`);
            
            const response = await fetch(`/api/search?q=${encodeURIComponent(id)}&type=movie&page=1`);
            const movies: Movie[] = await response.json();
            
            const found = movies.find(m => m.code.toUpperCase().includes(id.toUpperCase()));
            
            if (found) {
              consecutiveFails = 0;
              addLog(`📤 [${item.query}] Found and posting ${id}: ${found.title}`);
              await sendToTelegram(found);
              addActresses(found.actress, found);
              addStudios(found.studio);
              totalPostedTask++;
              totalPostedOverall++;
            } else {
              consecutiveFails++;
              addLog(`⚠️ [${item.query}] ${id} not found. Skipping... (${consecutiveFails}/${MAX_CONSECUTIVE_FAILS})`);
              await saveNotFound(id, item.query);
              if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
                addLog(`🛑 [${item.query}] Stopped: ${MAX_CONSECUTIVE_FAILS} consecutive IDs not found.`);
                break;
              }
            }
            current++;
            await new Promise(r => setTimeout(r, 2000));
          }
        } else if (item.mode === 'range') {
          const start = item.startNum;
          const end = item.rangeEndNum || start;
          const total = end - start + 1;
          
          setProgress({ current: 0, total });

          for (let current = start; current <= end; current++) {
            if (!postingRef.current) break;
            const padded = current.toString().padStart(item.padding || 0, '0');
            const id = `${item.query}-${padded}`;
            
            setProgress({ current: current - start + 1, total });
            setCurrentAction(`Searching ${id}...`);
            
            const response = await fetch(`/api/search?q=${encodeURIComponent(id)}&type=movie&page=1`);
            const movies: Movie[] = await response.json();
            
            const found = movies.find(m => m.code.toUpperCase().includes(id.toUpperCase()));
            
            if (found) {
              addLog(`📤 [${item.query}] Found and posting ${id}: ${found.title}`);
              await sendToTelegram(found);
              addActresses(found.actress, found);
              addStudios(found.studio);
              totalPostedTask++;
              totalPostedOverall++;
            } else {
              addLog(`⚠️ [${item.query}] ${id} not found. Skipping...`);
              await saveNotFound(id, item.query);
            }
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        const taskEndMsg = `🏁 Task ${qIdx + 1} finished. Posted: ${totalPostedTask}`;
        addLog(taskEndMsg);
        await sendLogToBotLog(taskEndMsg);
        
        // Remove completed task from queue if it was in the queue
        if (item.id !== 'temp') {
          setQueue(prev => prev.filter(q => q.id !== item.id));
        }
      }
      
      const endMsg = postingRef.current ? `✅ All tasks finished! Total posted: ${totalPostedOverall}` : `🛑 Autopost stopped by user. Total posted: ${totalPostedOverall}`;
      addLog(endMsg);
      await sendLogToBotLog(endMsg);
    } catch (err) {
      const errMsg = `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      addLog(errMsg);
      await sendLogToBotLog(errMsg);
    } finally {
      setIsPosting(false);
      postingRef.current = false;
      setCurrentAction('');
      setProgress({ current: 0, total: 0 });
    }
  };

  const stopAutopost = () => {
    setIsPosting(false);
    postingRef.current = false;
    addLog('🛑 Stopping autopost...');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Zap className="text-primary" /> Autopost
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <div className="flex p-1 bg-muted rounded-lg">
              <button 
                onClick={() => setMode('page')}
                className={`flex-1 py-2 text-[10px] font-bold rounded-md transition ${mode === 'page' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Page
              </button>
              <button 
                onClick={() => setMode('sequential')}
                className={`flex-1 py-2 text-[10px] font-bold rounded-md transition ${mode === 'sequential' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sequential
              </button>
              <button 
                onClick={() => setMode('range')}
                className={`flex-1 py-2 text-[10px] font-bold rounded-md transition ${mode === 'range' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Range
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                {mode === 'page' ? 'Search Query' : 'ID Prefix'}
              </label>
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === 'page' ? "e.g. STAR, Madoka Asamiya" : "e.g. STAR"}
                className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {mode === 'page' ? 'Start Page' : 'Start Num'}
                </label>
                <input 
                  type="number" 
                  value={startNum}
                  onChange={(e) => setStartNum(parseInt(e.target.value) || 1)}
                  className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
                />
              </div>
              <div>
                {mode === 'page' ? (
                  <>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">End Page</label>
                    <input 
                      type="number" 
                      value={endPage}
                      onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                      className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
                    />
                  </>
                ) : mode === 'range' ? (
                  <>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">End Num</label>
                    <input 
                      type="number" 
                      value={rangeEndNum}
                      onChange={(e) => setRangeEndNum(parseInt(e.target.value) || 1)}
                      className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Padding</label>
                    <input 
                      type="number" 
                      value={padding}
                      onChange={(e) => setPadding(parseInt(e.target.value) || 0)}
                      placeholder="e.g. 3"
                      className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
                    />
                  </>
                )}
              </div>
            </div>

            {mode === 'range' && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Padding</label>
                <input 
                  type="number" 
                  value={padding}
                  onChange={(e) => setPadding(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 3 for 001"
                  className="w-full p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
                />
              </div>
            )}
            
            <div className="flex gap-2">
              <button 
                onClick={addToQueue}
                disabled={!query || isPosting || queue.length >= 5}
                className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <UserPlus size={18} /> Add to Queue
              </button>
              <button 
                onClick={isPosting ? stopAutopost : startAutopost}
                disabled={(!query && queue.length === 0) && !isPosting}
                className={`flex-[2] py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm ${isPosting ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
              >
                {isPosting ? <><Pause size={18} /> Stop</> : <><Play size={18} /> {queue.length > 0 ? 'Start Queue' : 'Start Now'}</>}
              </button>
            </div>
          </div>

          {queue.length > 0 && (
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <h3 className="font-bold mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2"><Hash size={18} className="text-primary" /> Queue ({queue.length}/5)</span>
                {queue.length > 0 && !isPosting && (
                  <button onClick={() => setQueue([])} className="text-[10px] text-destructive hover:underline">Clear All</button>
                )}
              </h3>
              <div className="space-y-3">
                {queue.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50 group">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold truncate max-w-[120px]">{item.query}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{item.mode} • {item.startNum}{item.mode === 'range' ? `-${item.rangeEndNum}` : item.mode === 'page' ? `-${item.endPage}` : '+'}</span>
                    </div>
                    {!isPosting && (
                      <button 
                        onClick={() => removeFromQueue(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isPosting && (
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Loader2 className="animate-spin text-primary" size={18} /> Current Status
              </h3>
              <p className="text-sm text-muted-foreground mb-2">{currentAction}</p>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-500" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-right text-xs text-muted-foreground mt-1">
                {progress.current} / {progress.total}
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl p-6 shadow-inner h-[500px] flex flex-col border border-border">
            <h3 className="text-muted-foreground text-xs font-mono uppercase tracking-widest mb-4">Autopost Logs</h3>
            <div className="flex-grow overflow-y-auto font-mono text-sm space-y-1 custom-scrollbar">
              {logs.length === 0 && <p className="text-muted-foreground italic">No logs yet. Configure and start autopost to see progress.</p>}
              {logs.map((log, i) => (
                <div key={i} className={`py-1 border-b border-border/50 ${log.startsWith('❌') ? 'text-destructive' : log.startsWith('✅') ? 'text-green-500' : log.startsWith('📤') ? 'text-primary' : 'text-foreground'}`}>
                  <span className="text-muted-foreground mr-2">[{new Date().toLocaleTimeString()}]</span>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
