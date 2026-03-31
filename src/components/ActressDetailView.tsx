import { ChevronLeft, ChevronRight, ImageIcon, Loader2, Save, Trash2, UserPlus, Users } from 'lucide-react';
import { MovieDetails } from '../types';

export function ActressDetailView({
  selectedActress,
  setCurrentView,
  setProfilePicSelector,
  setActressToDelete,
  handleSearch,
  setSelectedActress,
  loadMoreActressMovies,
  loadAllActressMovies,
  loading
}: {
  selectedActress: {
    name: string;
    movies: MovieDetails[];
    page: number;
    hasMore: boolean;
    viewPage: number;
    profilePic?: string;
  };
  setCurrentView: (view: string) => void;
  setProfilePicSelector: (selector: { movieUrls: string[], actressName: string } | null) => void;
  setActressToDelete: (name: string | null) => void;
  handleSearch: (query: string, page: number, type: 'movie' | 'actress' | 'studio') => void;
  setSelectedActress: React.Dispatch<React.SetStateAction<{
    name: string;
    movies: MovieDetails[];
    page: number;
    hasMore: boolean;
    viewPage: number;
    profilePic?: string;
  } | null>>;
  loadMoreActressMovies: () => void;
  loadAllActressMovies: () => void;
  loading: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('actresses')}
            className="p-2 hover:bg-accent rounded-full transition"
          >
            <ChevronLeft size={24} />
          </button>
          {selectedActress.profilePic ? (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
              <img 
                src={selectedActress.profilePic} 
                alt={selectedActress.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-lg">
              <Users size={40} className="text-primary/40" />
            </div>
          )}
        </div>
        <div className="text-center md:text-left flex-grow">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">{selectedActress.name}</h2>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
            <p className="text-muted-foreground font-medium">
              {selectedActress.movies.length} Videos Found 
              {selectedActress.movies.length > 20 && ` (Showing ${((selectedActress.viewPage - 1) * 20) + 1}-${Math.min(selectedActress.viewPage * 20, selectedActress.movies.length)})`}
            </p>
            <button
              onClick={() => {
                const urls = selectedActress.movies.filter(m => m.link).map(m => m.link);
                if (urls.length > 0) {
                  setProfilePicSelector({ movieUrls: urls, actressName: selectedActress.name });
                }
              }}
              className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors"
              title="Suggest profile pictures from movie posters and screenshots"
            >
              <ImageIcon size={14} /> Suggest Profile Pictures
            </button>
            <button
              onClick={() => setActressToDelete(selectedActress.name)}
              className="text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors"
              title="Delete this actress from tracking"
            >
              <Trash2 size={14} /> Delete Actress
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-start">
        {selectedActress.movies
          .slice((selectedActress.viewPage - 1) * 20, selectedActress.viewPage * 20)
          .map((movie, index) => (
          <div key={`${movie.dvdId}-${index}`} className="relative group">
            <button
              onClick={() => handleSearch(movie.dvdId || movie.code || '', 1, 'movie')}
              className="w-full bg-card hover:bg-accent rounded-xl border border-border shadow-sm overflow-hidden transition flex flex-col"
            >
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
              <div className="p-3 text-center">
                <span className="font-bold text-xs text-primary group-hover:underline block">
                  {movie.dvdId || movie.code || 'N/A'}
                </span>
                <span className="text-[10px] text-muted-foreground line-clamp-1 mt-1 block">
                  {movie.title}
                </span>
              </div>
            </button>
            {movie.link && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProfilePicSelector({ movieUrls: [movie.link], actressName: selectedActress.name });
                }}
                className="absolute top-2 right-2 bg-primary/90 hover:bg-primary text-primary-foreground p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100 z-10"
                title="Set as profile picture"
              >
                <UserPlus size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex flex-col items-center gap-6">
        {selectedActress.movies.length > 20 && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedActress(prev => prev ? { ...prev, viewPage: prev.viewPage - 1 } : null)}
              disabled={selectedActress.viewPage === 1}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl font-semibold text-foreground hover:bg-accent disabled:opacity-30 transition"
            >
              <ChevronLeft size={20} /> Previous
            </button>
            <span className="font-bold text-sm">
              Page {selectedActress.viewPage} of {Math.ceil(selectedActress.movies.length / 20)}
            </span>
            <button
              onClick={() => setSelectedActress(prev => prev ? { ...prev, viewPage: prev.viewPage + 1 } : null)}
              disabled={selectedActress.viewPage >= Math.ceil(selectedActress.movies.length / 20)}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl font-semibold text-foreground hover:bg-accent disabled:opacity-30 transition"
            >
              Next <ChevronRight size={20} />
            </button>
          </div>
        )}

        {selectedActress.hasMore && (
          <div className="flex justify-center gap-4">
            <button
              onClick={loadMoreActressMovies}
              disabled={loading}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold py-2 px-6 rounded-xl transition flex items-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Load More Results'}
            </button>
            <button
              onClick={loadAllActressMovies}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-6 rounded-xl transition flex items-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Load All & Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
