import { Search, Users, ChevronRight, X, ChevronLeft } from 'lucide-react';
import { TrackedActress } from '../types';

export function ActressesView({
  actresses,
  actressSort,
  setActressSort,
  handleSearch,
  actressFilter,
  setActressFilter,
  actressesPage,
  setActressesPage,
  ACTRESSES_PER_PAGE,
  viewActressDetails,
  setActressToDelete
}: {
  actresses: TrackedActress[];
  actressSort: 'name' | 'count' | 'recent';
  setActressSort: (val: 'name' | 'count' | 'recent') => void;
  handleSearch: (query: string, page: number, type: 'movie' | 'actress' | 'studio') => void;
  actressFilter: string;
  setActressFilter: (val: string) => void;
  actressesPage: number;
  setActressesPage: (val: number | ((prev: number) => number)) => void;
  ACTRESSES_PER_PAGE: number;
  viewActressDetails: (name: string) => void;
  setActressToDelete: (name: string | null) => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold">Actresses</h2>
        <div className="flex items-center gap-3">
          <select 
            value={actressSort}
            onChange={(e) => setActressSort(e.target.value as any)}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="name">Sort by Name</option>
            <option value="count">Sort by Videos</option>
            <option value="recent">Sort by Recent</option>
          </select>
          <div className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full font-medium">
            {actresses.length} Tracked
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search for a new actress..." 
              className="flex-grow p-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value, 1, 'actress')}
            />
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm">Search</button>
          </div>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              value={actressFilter}
              onChange={(e) => {
                setActressFilter(e.target.value);
                setActressesPage(1);
              }}
              placeholder="Filter tracked actresses..." 
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground text-sm"
            />
          </div>
        </div>
      </div>

      {actresses.length > 0 ? (
        (() => {
          const filtered = actresses
            .filter(a => a.name.toLowerCase().includes(actressFilter.toLowerCase()))
            .sort((a, b) => {
              if (actressSort === 'name') return a.name.localeCompare(b.name);
              if (actressSort === 'count') return (b.movies?.length || 0) - (a.movies?.length || 0);
              if (actressSort === 'recent') {
                const dateA = (a as any).updatedAt?.seconds || 0;
                const dateB = (b as any).updatedAt?.seconds || 0;
                return dateB - dateA;
              }
              return 0;
            });
          
          return (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                {filtered
                  .slice((actressesPage - 1) * ACTRESSES_PER_PAGE, actressesPage * ACTRESSES_PER_PAGE)
                  .map((actress, index) => (
                <div key={index} className="flex flex-col items-center group relative">
                  <button
                    onClick={() => viewActressDetails(actress.name)}
                    className="flex flex-col items-center transition-transform hover:scale-105"
                  >
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-3">
                      {actress.profilePic ? (
                        <div className="w-full h-full rounded-full overflow-hidden border-4 border-primary/20 shadow-md group-hover:border-primary/40 transition-colors">
                          <img 
                            src={actress.profilePic} 
                            alt={actress.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-md group-hover:bg-primary/20 transition-colors">
                          <Users size={32} className="text-primary/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight size={24} className="text-white drop-shadow-md" />
                        </div>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-center line-clamp-2 max-w-[100px]">{actress.name}</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActressToDelete(actress.name);
                    }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"
                    title="Remove actress"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

              {filtered.length > ACTRESSES_PER_PAGE && (
                <div className="flex justify-center items-center gap-6 mt-12">
                  <button
                    disabled={actressesPage === 1}
                    onClick={() => setActressesPage(prev => prev - 1)}
                    className="p-2 rounded-full border border-border hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.ceil(filtered.length / ACTRESSES_PER_PAGE) }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActressesPage(i + 1)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${actressesPage === i + 1 ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                        title={`Page ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    disabled={actressesPage >= Math.ceil(filtered.length / ACTRESSES_PER_PAGE)}
                    onClick={() => setActressesPage(prev => prev + 1)}
                    className="p-2 rounded-full border border-border hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              )}
            </>
          );
        })()
      ) : (
        <div className="bg-card p-12 rounded-2xl border border-border shadow-sm text-center">
          <Users size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">No actresses tracked yet. Search for movies or actresses to populate this list.</p>
        </div>
      )}
    </div>
  );
}
