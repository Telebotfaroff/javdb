import { Building2, X } from 'lucide-react';

export function StudiosView({
  studios,
  handleSearch,
  removeStudio
}: {
  studios: string[];
  handleSearch: (query: string, page: number, type: 'movie' | 'actress' | 'studio') => void;
  removeStudio: (name: string) => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">Studios</h2>
        <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {studios.length} Tracked
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm mb-8">
        <div className="flex gap-2 max-w-md mx-auto">
          <input 
            type="text" 
            placeholder="Search for a new studio..." 
            className="flex-grow p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-transparent text-foreground"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value, 1, 'studio')}
          />
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold">Search</button>
        </div>
      </div>

      {studios.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {studios.map((name, index) => (
            <div key={index} className="relative group">
              <button
                onClick={() => handleSearch(name, 1, 'studio')}
                className="w-full bg-card hover:bg-accent p-4 rounded-xl border border-border shadow-sm text-center transition group-hover:border-primary/50"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition">
                  <Building2 size={20} className="text-primary" />
                </div>
                <span className="font-medium text-sm block truncate">{name}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeStudio(name);
                }}
                className="absolute top-2 right-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100 z-10"
                title="Remove studio"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card p-12 rounded-2xl border border-border shadow-sm text-center">
          <Building2 size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">No studios tracked yet. Search for movies or studios to populate this list.</p>
        </div>
      )}
    </div>
  );
}
