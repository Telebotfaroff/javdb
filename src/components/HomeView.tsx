import { Search, UserPlus, Send } from 'lucide-react';
import { Movie } from '../types';

export function HomeView({
  query,
  setQuery,
  handleSearch,
  loading,
  detailsLoading,
  error,
  compactView,
  results,
  splitNames,
  fetchDetails,
  searchType,
  addActresses,
  sendToTelegram,
  page
}: {
  query: string;
  setQuery: (val: string) => void;
  handleSearch: (query: string, page: number, type?: 'movie' | 'actress' | 'studio') => void;
  loading: boolean;
  detailsLoading: boolean;
  error: string | null;
  compactView: boolean;
  results: Movie[];
  splitNames: (str: string) => string[];
  fetchDetails: (url: string) => void;
  searchType: 'movie' | 'actress' | 'studio';
  addActresses: (name: string) => void;
  sendToTelegram: (movie: Movie) => void;
  page: number;
}) {
  return (
    <>
      <div className="max-w-2xl mx-auto mb-12">
        <div className="flex gap-2 bg-card p-2 rounded-xl shadow-sm border border-border items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, title, actress or studio..."
            className="flex-grow p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
          />
          <button onClick={() => handleSearch(query, 1)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg flex items-center gap-2 font-semibold transition">
            <Search size={20} /> Search
          </button>
        </div>
      </div>

      {loading && <p className="text-center text-muted-foreground">Searching...</p>}
      {detailsLoading && <p className="text-center fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground z-50">Loading details...</p>}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-xl mb-8" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className={`grid gap-8 items-start ${compactView ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {results.map((movie, index) => (
          <div key={`${movie.link}-${index}`} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-md transition flex flex-col relative">
            {movie.poster && (
              <div className="relative bg-muted">
                <img 
                  src={movie.poster} 
                  alt={movie.title} 
                  className="w-full h-auto block" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            )}
            <div className={`${compactView ? 'p-3' : 'p-5'} flex-grow flex flex-col`}>
              <h2 className={`${compactView ? 'text-sm' : 'text-lg'} font-bold text-card-foreground mb-2 line-clamp-2`}>{movie.title}</h2>
              {!compactView && movie.actress && (
                <div className="flex flex-wrap gap-x-2 gap-y-1 mb-4">
                  {splitNames(movie.actress).map((name, i) => (
                    <p 
                      key={i}
                      className="text-sm text-primary cursor-pointer hover:underline" 
                      onClick={() => handleSearch(name, 1, 'actress')}
                    >
                      {name}
                    </p>
                  ))}
                </div>
              )}
              {!compactView && (
                <div className="text-xs text-muted-foreground space-y-1 mb-4">
                  {movie.releaseDate && <p>Released: {movie.releaseDate}</p>}
                  {movie.studio && (
                    <div className="flex flex-wrap gap-x-1">
                      <span className="text-muted-foreground">Studio:</span>
                      {splitNames(movie.studio).map((name, i, arr) => (
                        <span 
                          key={i}
                          className="text-primary cursor-pointer hover:underline" 
                          onClick={() => handleSearch(name, 1, 'studio')}
                        >
                          {name}{i < arr.length - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!compactView && movie.plot && <p className="text-sm text-muted-foreground mb-6 line-clamp-3">{movie.plot}</p>}
              <div className="mt-auto flex gap-2">
                <button onClick={() => fetchDetails(movie.link)} className={`flex-grow bg-secondary hover:bg-secondary/80 text-secondary-foreground ${compactView ? 'text-xs py-1' : 'text-sm py-2'} font-semibold px-4 rounded-lg transition`}>View</button>
                {searchType === 'actress' && (
                  <button 
                    onClick={() => addActresses(movie.title)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-lg transition"
                    title="Track actress"
                  >
                    <UserPlus size={18} />
                  </button>
                )}
                <button 
                  onClick={() => sendToTelegram(movie)} 
                  className="bg-[#229ED9] hover:bg-[#1d8bc1] text-white p-2 rounded-lg transition flex items-center justify-center"
                  title="Post to Telegram"
                >
                  <Send size={compactView ? 14 : 18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {results.length > 0 && (
        <div className="flex justify-center gap-4 mt-12">
          <button
            disabled={page === 1}
            onClick={() => handleSearch(query, page - 1)}
            className="px-6 py-3 bg-card border border-border rounded-xl font-semibold text-foreground hover:bg-accent disabled:opacity-50 transition"
          >
            Previous
          </button>
          <span className="px-6 py-3 font-semibold text-foreground">Page {page}</span>
          <button
            onClick={() => handleSearch(query, page + 1)}
            className="px-6 py-3 bg-card border border-border rounded-xl font-semibold text-foreground hover:bg-accent transition"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
