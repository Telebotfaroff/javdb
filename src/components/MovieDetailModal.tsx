import { AlertCircle, CheckCircle2, Film, ImageIcon, Play, Send } from 'lucide-react';
import { MovieDetails } from '../types';

export function MovieDetailModal({
  selectedMovie,
  setSelectedMovie,
  handleSearch,
  splitNames,
  fetchDetails,
  sendToTelegram,
  tgStatus
}: {
  selectedMovie: MovieDetails;
  setSelectedMovie: (movie: MovieDetails | null) => void;
  handleSearch: (query: string, page: number, type: 'movie' | 'actress' | 'studio') => void;
  splitNames: (names: string | undefined) => string[];
  fetchDetails: (url: string) => void;
  sendToTelegram: (movie: MovieDetails) => void;
  tgStatus: { type: 'success' | 'error'; message: string } | null;
}) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedMovie(null)}>
      <div className="bg-card p-8 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setSelectedMovie(null)} className="mb-6 text-primary font-semibold hover:underline flex items-center gap-1">&larr; Back to results</button>
        <h2 className="text-3xl font-extrabold mb-6 text-foreground tracking-tight">{selectedMovie.title}</h2>
        <div className="relative w-full overflow-hidden rounded-xl mb-6 shadow-md bg-muted">
          <img 
            src={selectedMovie.poster || 'https://via.placeholder.com/800x1200?text=No+Poster'} 
            alt={selectedMovie.title} 
            className="w-full h-auto block" 
            referrerPolicy="no-referrer" 
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-foreground bg-muted p-4 rounded-xl">
          <p><strong className="text-foreground">DVD ID:</strong> {selectedMovie.dvdId}</p>
          {selectedMovie.contentId && <p><strong className="text-foreground">Content ID:</strong> {selectedMovie.contentId}</p>}
          <p><strong className="text-foreground">Release Date:</strong> {selectedMovie.releaseDate}</p>
          <p><strong className="text-foreground">Runtime:</strong> {selectedMovie.runtime}</p>
          <div className="flex flex-wrap gap-x-1">
            <strong className="text-foreground">Studio:</strong>
            {splitNames(selectedMovie.studio).map((name, i, arr) => (
              <span 
                key={i}
                className="text-primary cursor-pointer hover:underline" 
                onClick={() => { handleSearch(name, 1, 'studio'); setSelectedMovie(null); }}
              >
                {name}{i < arr.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
          {selectedMovie.director && <p><strong className="text-foreground">Director:</strong> {selectedMovie.director}</p>}
          {selectedMovie.actress && (
            <div className="flex flex-wrap gap-x-1">
              <strong className="text-foreground">Actress:</strong>
              {splitNames(selectedMovie.actress).map((name, i, arr) => (
                <span 
                  key={i}
                  className="text-primary cursor-pointer hover:underline" 
                  onClick={() => { handleSearch(name, 1, 'actress'); setSelectedMovie(null); }}
                >
                  {name}{i < arr.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
          )}
          {selectedMovie.genres && (
            <div className="sm:col-span-2">
              <strong className="text-foreground">Genres:</strong> {selectedMovie.genres.join(', ')}
            </div>
          )}
          {selectedMovie.streamingLinks && selectedMovie.streamingLinks.length > 0 && (
            <div className="sm:col-span-2 mt-2">
              <strong className="text-foreground block mb-2">Watch Online:</strong>
              <div className="flex flex-wrap gap-2">
                {selectedMovie.streamingLinks.map((link: any, idx: number) => (
                  <a 
                    key={idx} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Play size={14} /> {link.site}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="mt-6 text-muted-foreground leading-relaxed">{selectedMovie.plot}</p>
        
        {selectedMovie.screenshots && selectedMovie.screenshots.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
              <ImageIcon size={20} className="text-primary" /> Screenshots
            </h3>
            <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
              {selectedMovie.screenshots.map((src, index) => (
                <div 
                  key={index} 
                  className="flex-shrink-0 w-64 sm:w-80 rounded-xl overflow-hidden shadow-md border border-border bg-muted snap-start cursor-zoom-in hover:scale-[1.02] transition-transform"
                  onClick={() => window.open(src, '_blank')}
                >
                  <img 
                    src={src} 
                    alt={`Screenshot ${index + 1}`} 
                    className="w-full h-auto block"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {selectedMovie.similarMovies && selectedMovie.similarMovies.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
              <Film size={20} className="text-primary" /> Similar Movies
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-start">
              {selectedMovie.similarMovies.map((sim, index) => (
                <div 
                  key={`${sim.link}-${index}`} 
                  className="group cursor-pointer"
                  onClick={() => fetchDetails(sim.link)}
                >
                  <div className="bg-muted rounded-lg overflow-hidden mb-2 border border-border">
                    <img 
                      src={sim.poster || 'https://via.placeholder.com/200x300?text=No+Poster'} 
                      alt={sim.title} 
                      className="w-full h-auto block group-hover:scale-110 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{sim.code}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{sim.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
          <button 
            onClick={() => sendToTelegram(selectedMovie)}
            className="flex items-center gap-2 bg-[#229ED9] hover:bg-[#1d8bc1] text-white px-6 py-3 rounded-xl font-bold transition shadow-sm"
          >
            <Send size={20} /> Post to Telegram
          </button>
          
          {tgStatus && (
            <div className={`flex items-center gap-2 text-sm font-medium ${tgStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {tgStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {tgStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
