import { useState, useEffect, useRef } from 'react';
import { Search, Menu, X, Settings, Users, Building2, Home, Send, CheckCircle2, AlertCircle, Zap, Play, Pause, Loader2, Film, ChevronLeft, ChevronRight, UserPlus, Save, Image as ImageIcon, Hash, Copy, Trash2 } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query as firestoreQuery, orderBy, getDocs, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { ProfilePicSelector } from './components/ProfilePicSelector';
import { AutopostView } from './components/AutopostView';
import { SettingsView } from './components/SettingsView';
import { NotFoundView } from './components/NotFoundView';
import { HomeView } from './components/HomeView';
import { ActressesView } from './components/ActressesView';
import { JavCodesView } from './components/JavCodesView';
import { StudiosView } from './components/StudiosView';
import { ActressDetailView } from './components/ActressDetailView';
import { MovieDetailModal } from './components/MovieDetailModal';
import { OperationType, FirestoreErrorInfo, Movie, MovieDetails, QueueItem, TrackedActress } from './types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      providerInfo: []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the app, but we log it clearly
}

export default function App() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'movie' | 'actress' | 'studio'>('movie');
  const [results, setResults] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieDetails | null>(null);
  const [selectedActress, setSelectedActress] = useState<{ 
    name: string; 
    profilePic?: string | null; 
    movies: Movie[]; 
    page: number; 
    viewPage: number;
    hasMore: boolean 
  } | null>(null);
  const [profilePicSelector, setProfilePicSelector] = useState<{ movieUrls: string[], actressName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'actresses' | 'studios' | 'settings' | 'autopost' | 'actress-detail' | 'jav-codes' | 'not-found'>('home');
  const [telegramBotToken, setTelegramBotToken] = useState(localStorage.getItem('tg_bot_token') || '');
  const [telegramChannelId, setTelegramChannelId] = useState(localStorage.getItem('tg_channel_id') || '');
  const [botLogToken, setBotLogToken] = useState(localStorage.getItem('bot_log_token') || '');
  const [tgStatus, setTgStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const sendLogToBotLog = async (message: string) => {
    if (!botLogToken) return;
    try {
      await fetch(`https://api.telegram.org/bot${botLogToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '7367490186',
          text: message,
          parse_mode: 'HTML'
        })
      });
    } catch (err) {
      console.error('Failed to send log to BotLog:', err);
    }
  };
  const [darkMode, setDarkMode] = useState(localStorage.getItem('dark_mode') === 'true');
  const [compactView, setCompactView] = useState(localStorage.getItem('compact_view') === 'true');
  const [actressesPage, setActressesPage] = useState(1);
  const [actressSort, setActressSort] = useState<'name' | 'count' | 'recent'>('name');
  const [actressFilter, setActressFilter] = useState('');
  const [actressToDelete, setActressToDelete] = useState<string | null>(null);
  const [javCodesPage, setJavCodesPage] = useState(1);
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const ACTRESSES_PER_PAGE = 20;
  const JAV_CODES_PER_PAGE = 20;
  const [actresses, setActresses] = useState<TrackedActress[]>([]);
  const [notFoundItems, setNotFoundItems] = useState<{ code: string; createdAt: any; query: string }[]>([]);
  const [javCodes, setJavCodes] = useState<{ prefix: string; codes: string[] }[]>([]);
  const [studios, setStudios] = useState<string[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), {
        telegramBotToken,
        telegramChannelId,
        botLogToken,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setTgStatus({ type: 'success', message: 'Settings saved to database!' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/config');
      setTgStatus({ type: 'error', message: 'Failed to save settings to database.' });
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setTgStatus(null), 3000);
    }
  };

  const saveNotFound = async (code: string, query: string) => {
    try {
      await setDoc(doc(db, 'notFound', code), {
        code,
        query,
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notFound/${code}`);
    }
  };

  const deleteNotFound = async (code: string) => {
    try {
      await deleteDoc(doc(db, 'notFound', code));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notFound/${code}`);
    }
  };

  const clearAllNotFound = async () => {
    if (!window.confirm('Are you sure you want to clear all not found IDs?')) return;
    try {
      const snapshot = await getDocs(collection(db, 'notFound'));
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notFound');
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'config'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.telegramBotToken) setTelegramBotToken(data.telegramBotToken);
          if (data.telegramChannelId) setTelegramChannelId(data.telegramChannelId);
          if (data.botLogToken) setBotLogToken(data.botLogToken);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings/config');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const qActresses = firestoreQuery(collection(db, 'actresses'), orderBy('name'));
    const unsubscribeActresses = onSnapshot(qActresses, (snapshot) => {
      const items: TrackedActress[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as TrackedActress);
      });
      setActresses(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'actresses');
    });

    const qJavCodes = firestoreQuery(collection(db, 'javCodes'), orderBy('prefix'));
    const unsubscribeJavCodes = onSnapshot(qJavCodes, (snapshot) => {
      const items: { prefix: string; codes: string[] }[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as { prefix: string; codes: string[] });
      });
      setJavCodes(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'javCodes');
    });

    const qStudios = firestoreQuery(collection(db, 'studios'), orderBy('name'));
    const unsubscribeStudios = onSnapshot(qStudios, (snapshot) => {
      const items: string[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data().name);
      });
      setStudios(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'studios');
    });

    const qNotFound = firestoreQuery(collection(db, 'notFound'), orderBy('createdAt', 'desc'));
    const unsubscribeNotFound = onSnapshot(qNotFound, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data());
      });
      setNotFoundItems(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notFound');
    });

    return () => {
      unsubscribeActresses();
      unsubscribeStudios();
      unsubscribeJavCodes();
      unsubscribeNotFound();
    };
  }, []);

  useEffect(() => {
    const fetchMissingProfilePics = async () => {
      const missing = actresses.filter(a => !a.profilePic);
      if (missing.length === 0) return;
      
      for (const actress of missing) {
        try {
          const resp = await fetch(`/api/actress?name=${encodeURIComponent(actress.name)}`);
          if (!resp.ok) continue;
          const info = await resp.json();
          if (info?.profilePic) {
            await setDoc(doc(db, 'actresses', actress.name), {
              profilePic: info.profilePic
            }, { merge: true });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `actresses/${actress.name}`);
        }
      }
    };
    
    fetchMissingProfilePics();
  }, [actresses.length]);

  const splitNames = (str?: string) => {
    if (!str) return [];
    // Enhanced split to handle various delimiters including Japanese ones and space-separated / or ,
    return str.split(/[,\/&|、，；;]|\s+[,\/&|]\s+|\s+and\s+/i).map(n => n.trim()).filter(Boolean);
  };

  const addActresses = async (actressStr?: string, movie?: Movie | MovieDetails) => {
    if (!actressStr) return;
    const names = splitNames(actressStr);
    
    for (const name of names) {
      try {
        // Normalize name to Title Case for consistency
        const normalizedName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        
        const movieData = movie ? {
          code: (movie as any).code || (movie as any).dvdId,
          title: movie.title,
          link: (movie as any).link || '',
          poster: movie.poster
        } : null;

        const updateData: any = {
          name: normalizedName,
          updatedAt: serverTimestamp()
        };

        // Only set createdAt if it's a new document
        // We'll use setDoc with merge: true, but we can't easily do conditional createdAt without a get
        // So we'll just always update updatedAt and let createdAt be set on first write if we were using a different approach
        // Actually, let's just keep it simple as it was but with normalized name
        
        if (movieData && movieData.code) {
          updateData.movies = arrayUnion(movieData);
        }

        await setDoc(doc(db, 'actresses', normalizedName), updateData, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `actresses/${name}`);
      }
    }
  };

  const removeActress = async (name: string) => {
    try {
      await deleteDoc(doc(db, 'actresses', name));
      if (selectedActress?.name === name) {
        setSelectedActress(null);
        setCurrentView('actresses');
      }
      const maxPage = Math.ceil((actresses.length - 1) / ACTRESSES_PER_PAGE) || 1;
      if (actressesPage > maxPage) {
        setActressesPage(maxPage);
      }
      setActressToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `actresses/${name}`);
    }
  };

  const updateActressProfilePic = async (name: string, imageUrl: string) => {
    try {
      await setDoc(doc(db, 'actresses', name), {
        profilePic: imageUrl
      }, { merge: true });
      
      if (selectedActress && selectedActress.name === name) {
        setSelectedActress(prev => prev ? { ...prev, profilePic: imageUrl } : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `actresses/${name}`);
    }
  };

  const syncJavCodes = async () => {
    const codeMap: Record<string, Set<string>> = {};
    
    actresses.forEach(actress => {
      actress.movies?.forEach(movie => {
        if (movie.code) {
          const match = movie.code.match(/^([A-Z]+)-(\d+)$/i);
          if (match) {
            const prefix = match[1].toUpperCase();
            if (!codeMap[prefix]) codeMap[prefix] = new Set();
            codeMap[prefix].add(movie.code.toUpperCase());
          } else {
            const prefix = movie.code.split('-')[0].toUpperCase();
            if (!codeMap[prefix]) codeMap[prefix] = new Set();
            codeMap[prefix].add(movie.code.toUpperCase());
          }
        }
      });
    });

    for (const [prefix, codes] of Object.entries(codeMap)) {
      try {
        await setDoc(doc(db, 'javCodes', prefix), {
          prefix,
          codes: Array.from(codes).sort(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `javCodes/${prefix}`);
      }
    }
  };

  const addStudios = async (studioStr?: string) => {
    if (!studioStr) return;
    const names = studioStr.split(/[,\/&|]|\s+and\s+/i).map(n => n.trim()).filter(Boolean);
    
    for (const name of names) {
      if (!studios.includes(name)) {
        try {
          await setDoc(doc(db, 'studios', name), {
            name,
            createdAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `studios/${name}`);
        }
      }
    }
  };

  const removeStudio = async (name: string) => {
    try {
      await deleteDoc(doc(db, 'studios', name));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${name}`);
    }
  };

  useEffect(() => {
    localStorage.setItem('tg_bot_token', telegramBotToken);
  }, [telegramBotToken]);

  useEffect(() => {
    localStorage.setItem('tg_channel_id', telegramChannelId);
  }, [telegramChannelId]);

  useEffect(() => {
    localStorage.setItem('bot_log_token', botLogToken);
  }, [botLogToken]);

  useEffect(() => {
    localStorage.setItem('dark_mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('compact_view', compactView.toString());
  }, [compactView]);

  const sendToTelegram = async (movieOrDetails: Movie | MovieDetails) => {
    if (!telegramBotToken || !telegramChannelId) {
      setTgStatus({ type: 'error', message: 'Please configure Telegram settings first.' });
      setTimeout(() => setTgStatus(null), 3000);
      return;
    }

    let movie: MovieDetails;
    if ('similarMovies' in movieOrDetails) {
      movie = movieOrDetails as MovieDetails;
    } else {
      setDetailsLoading(true);
      try {
        const response = await fetch(`/api/movie?url=${encodeURIComponent(movieOrDetails.link)}`);
        if (!response.ok) throw new Error('Failed to fetch details');
        movie = await response.json();
      } catch (err) {
        setTgStatus({ type: 'error', message: 'Failed to fetch movie details for Telegram.' });
        setTimeout(() => setTgStatus(null), 3000);
        setDetailsLoading(false);
        return;
      } finally {
        setDetailsLoading(false);
      }
    }

    // Save to database
    addActresses(movie.actress, movie);
    addStudios(movie.studio);

    // Generate caption with fallback for 1024 char limit
    const generateCaption = (m: MovieDetails, includeActress: boolean) => {
      const dId = m.dvdId || (m as any).code;
      const dPrefix = dId.split('-')[0].replace(/[0-9]/g, '').toUpperCase();
      
      const actressList = m.actress ? m.actress.split(/[,\/&|]|\s+and\s+/i).map(a => a.trim()).filter(Boolean) : [];
      const displayActresses = actressList.slice(0, 5).join(', ');
      const actressHashtags = includeActress ? actressList.slice(0, 5).map(a => `#${a.toLowerCase().replace(/\s+/g, '')}`).join(' ') : '';
      const hTags = [`#${dPrefix}`, actressHashtags].filter(Boolean).join(' ');

      let caption = `🎬 ${m.title} ${displayActresses}\n\n`;
      caption += `📀 IDs: DVD: ${dId}${m.contentId ? ` | Content: ${m.contentId}` : ''}\n\n`;
      caption += `📅 ${m.releaseDate} | ⏱ ${m.runtime} | 🏢 ${m.studio}\n\n`;
      caption += `🎥 Director: ${m.director || 'N/A'}\n`;
      if (includeActress && displayActresses) {
        caption += `👥 Actresses: ${displayActresses}\n`;
      }
      caption += `\n🎭 Genres: ${m.genres?.join(', ') || 'N/A'}\n\n🔖 Hashtags: ${hTags}`;
      return caption;
    };

    let text = generateCaption(movie, true);
    if (text.length > 1024) {
      text = generateCaption(movie, false);
    }
    
    // Final safety truncation
    if (text.length > 1024) {
      text = text.substring(0, 1021) + '...';
    }
    
    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/sendPhoto`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChannelId,
          photo: movie.poster,
          caption: text,
          parse_mode: 'HTML'
        })
      });

      if (response.ok) {
        setTgStatus({ type: 'success', message: 'Posted to Telegram successfully!' });
        await sendLogToBotLog(`✅ <b>Success:</b> Posted ${movie.dvdId} to Telegram.`);
      } else {
        const data = await response.json();
        setTgStatus({ type: 'error', message: `Telegram Error: ${data.description || 'Unknown error'}` });
        await sendLogToBotLog(`❌ <b>Failed:</b> Post ${movie.dvdId} failed: ${data.description || 'Unknown error'}`);
      }
    } catch (err) {
      setTgStatus({ type: 'error', message: 'Failed to connect to Telegram API.' });
      await sendLogToBotLog(`❌ <b>Error:</b> Connection failed while posting ${movie.dvdId}.`);
    }
    setTimeout(() => setTgStatus(null), 3000);
  };

  const handleSearch = async (searchQuery?: string, pageNumber: number = 1, type?: 'movie' | 'actress' | 'studio') => {
    const q = searchQuery || query;
    const t = type || (q.includes('-') ? 'movie' : searchType);
    setQuery(q);
    setPage(pageNumber);
    setLoading(true);
    setError(null);
    setCurrentView('home'); // Switch to home view on search
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${t}&page=${pageNumber}`);
      const data: Movie[] = await response.json();
      setResults(data);
      
      // Track actresses and studios from search results
      data.forEach(movie => {
        addActresses(movie.actress, movie);
        addStudios(movie.studio);
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (url: string) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/movie?url=${encodeURIComponent(url)}`);
      const data: MovieDetails = await response.json();
      setSelectedMovie(data);
      
      // Track actresses and studios from movie details
      addActresses(data.actress, data);
      addStudios(data.studio);
      
      // Clear results and query as requested
      setResults([]);
      setQuery('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const viewActressDetails = async (name: string) => {
    setLoading(true);
    try {
      // Fetch actress info (profile pic)
      const actressInfoResp = await fetch(`/api/actress?name=${encodeURIComponent(name)}`);
      const actressInfo = await actressInfoResp.json();
      
      // Fetch her movies
      const response = await fetch(`/api/search-fast?q=${encodeURIComponent(name)}&type=movie&page=1`);
      const data: Movie[] = await response.json();
      
      setSelectedActress({ 
        name, 
        profilePic: actressInfo?.profilePic || null,
        movies: data,
        page: 1,
        viewPage: 1,
        hasMore: data.length > 0
      });
      setCurrentView('actress-detail');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreActressMovies = async () => {
    if (!selectedActress || !selectedActress.hasMore) return;
    setLoading(true);
    try {
      const nextPage = selectedActress.page + 1;
      const response = await fetch(`/api/search-fast?q=${encodeURIComponent(selectedActress.name)}&type=movie&page=${nextPage}`);
      const data: Movie[] = await response.json();
      
      setSelectedActress(prev => {
        if (!prev) return null;
        const finalMovies = [...prev.movies, ...data];
        
        // Save to database
        setDoc(doc(db, 'actresses', prev.name), {
          movies: finalMovies.map(m => ({
            code: m.code,
            title: m.title,
            link: m.link,
            poster: m.poster
          }))
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `actresses/${prev.name}`));

        return {
          ...prev,
          movies: finalMovies,
          page: nextPage,
          viewPage: prev.viewPage,
          hasMore: data.length > 0
        };
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllActressMovies = async () => {
    if (!selectedActress || !selectedActress.hasMore) return;
    setLoading(true);
    try {
      let currentPage = selectedActress.page + 1;
      let allNewMovies: Movie[] = [];
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(`/api/search-fast?q=${encodeURIComponent(selectedActress.name)}&type=movie&page=${currentPage}`);
        const data: Movie[] = await response.json();
        
        if (data.length === 0) {
          hasMore = false;
        } else {
          allNewMovies = [...allNewMovies, ...data];
          currentPage++;
        }
      }

      setSelectedActress(prev => {
        if (!prev) return null;
        
        // Filter out duplicates just in case
        const existingCodes = new Set(prev.movies.map(m => m.code));
        const uniqueNewMovies = allNewMovies.filter(m => !existingCodes.has(m.code));
        
        const finalMovies = [...prev.movies, ...uniqueNewMovies];
        
        // Save to database
        setDoc(doc(db, 'actresses', prev.name), {
          movies: finalMovies.map(m => ({
            code: m.code,
            title: m.title,
            link: m.link,
            poster: m.poster
          }))
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `actresses/${prev.name}`));

        return {
          ...prev,
          movies: finalMovies,
          page: currentPage - 1,
          viewPage: prev.viewPage,
          hasMore: false
        };
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-sidebar border-r border-border z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <Film size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">JAV<span className="text-primary">DB</span></span>
          </div>

          <nav className="flex-grow space-y-2">
            <button 
              onClick={() => { setCurrentView('home'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === 'home' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              <Home size={20} /> <span className="font-medium">Home</span>
            </button>
            <button 
              onClick={() => { setCurrentView('actresses'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === 'actresses' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              <Users size={20} /> <span className="font-medium">Actresses</span>
            </button>
            <button 
              onClick={() => { setCurrentView('studios'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === 'studios' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              <Building2 size={20} /> <span className="font-medium">Studios</span>
            </button>
            <button 
              onClick={() => { setCurrentView('jav-codes'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === 'jav-codes' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              <Hash size={20} /> <span className="font-medium">Jav Code</span>
            </button>
            <button 
              onClick={() => { setCurrentView('not-found'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === 'not-found' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              <AlertCircle size={20} /> <span className="font-medium">Not Found</span>
            </button>
            <button 
              onClick={() => { setCurrentView('autopost'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === 'autopost' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              <Zap size={20} /> <span className="font-medium">Autopost</span>
            </button>
          </nav>

          <div className="pt-6 border-t border-border">
            <button 
              onClick={() => { setCurrentView('settings'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === 'settings' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              <Settings size={20} /> <span className="font-medium">Settings</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-grow lg:pl-0">
        <header className="bg-card border-b border-border sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-accent rounded-lg text-foreground">
                <Menu size={20} />
              </button>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                JAV<span className="text-primary">Database</span>
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-12">
          {currentView === 'home' && (
            <HomeView 
              query={query}
              setQuery={setQuery}
              handleSearch={handleSearch}
              loading={loading}
              detailsLoading={detailsLoading}
              error={error}
              compactView={compactView}
              results={results}
              splitNames={splitNames}
              fetchDetails={fetchDetails}
              searchType={searchType}
              addActresses={addActresses}
              sendToTelegram={sendToTelegram}
              page={page}
            />
          )}

          {currentView === 'actresses' && (
            <ActressesView 
              actresses={actresses}
              actressSort={actressSort}
              setActressSort={setActressSort}
              handleSearch={handleSearch}
              actressFilter={actressFilter}
              setActressFilter={setActressFilter}
              actressesPage={actressesPage}
              setActressesPage={setActressesPage}
              ACTRESSES_PER_PAGE={ACTRESSES_PER_PAGE}
              viewActressDetails={viewActressDetails}
              setActressToDelete={setActressToDelete}
            />
          )}

          {currentView === 'jav-codes' && (
            <JavCodesView 
              javCodes={javCodes}
              javCodesPage={javCodesPage}
              setJavCodesPage={setJavCodesPage}
              JAV_CODES_PER_PAGE={JAV_CODES_PER_PAGE}
              copiedGroup={copiedGroup}
              setCopiedGroup={setCopiedGroup}
              syncJavCodes={syncJavCodes}
              handleSearch={handleSearch}
            />
          )}

          {currentView === 'actress-detail' && selectedActress && (
            <ActressDetailView 
              selectedActress={selectedActress}
              setCurrentView={setCurrentView}
              setProfilePicSelector={setProfilePicSelector}
              setActressToDelete={setActressToDelete}
              handleSearch={handleSearch}
              setSelectedActress={setSelectedActress}
              loadMoreActressMovies={loadMoreActressMovies}
              loadAllActressMovies={loadAllActressMovies}
              loading={loading}
            />
          )}

          {currentView === 'studios' && (
            <StudiosView 
              studios={studios}
              handleSearch={handleSearch}
              removeStudio={removeStudio}
            />
          )}

          {currentView === 'autopost' && (
            <AutopostView 
              handleSearch={handleSearch} 
              sendToTelegram={sendToTelegram} 
              tgStatus={tgStatus}
              addActresses={addActresses}
              addStudios={addStudios}
              sendLogToBotLog={sendLogToBotLog}
              saveNotFound={saveNotFound}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView 
              telegramBotToken={telegramBotToken}
              setTelegramBotToken={setTelegramBotToken}
              telegramChannelId={telegramChannelId}
              setTelegramChannelId={setTelegramChannelId}
              botLogToken={botLogToken}
              setBotLogToken={setBotLogToken}
              saveSettings={saveSettings}
              isSavingSettings={isSavingSettings}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              compactView={compactView}
              setCompactView={setCompactView}
            />
          )}

          {currentView === 'not-found' && (
            <NotFoundView 
              notFoundItems={notFoundItems}
              clearAllNotFound={clearAllNotFound}
              handleSearch={handleSearch}
              deleteNotFound={deleteNotFound}
            />
          )}

          {actressToDelete && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={32} className="text-destructive" />
                </div>
                <h3 className="text-2xl font-bold text-center mb-2">Delete Actress?</h3>
                <p className="text-muted-foreground text-center mb-8">
                  Are you sure you want to remove <span className="font-bold text-foreground">{actressToDelete}</span> from your tracked list? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActressToDelete(null)}
                    className="flex-grow py-3 px-4 bg-muted hover:bg-muted/80 rounded-xl font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => removeActress(actressToDelete)}
                    className="flex-grow py-3 px-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {selectedMovie && (
        <MovieDetailModal 
          selectedMovie={selectedMovie}
          setSelectedMovie={setSelectedMovie}
          handleSearch={handleSearch}
          splitNames={splitNames}
          fetchDetails={fetchDetails}
          sendToTelegram={sendToTelegram}
          tgStatus={tgStatus}
        />
      )}

      {profilePicSelector && (
        <ProfilePicSelector
          movieUrls={profilePicSelector.movieUrls}
          actressName={profilePicSelector.actressName}
          onClose={() => setProfilePicSelector(null)}
          onSave={(base64Image) => {
            updateActressProfilePic(profilePicSelector.actressName, base64Image);
            setProfilePicSelector(null);
          }}
        />
      )}
    </div>
  );
}
