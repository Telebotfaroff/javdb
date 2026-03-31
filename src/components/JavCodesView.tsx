import { CheckCircle2, Copy, Zap, ChevronLeft, ChevronRight, Hash } from 'lucide-react';

export function JavCodesView({
  javCodes,
  javCodesPage,
  setJavCodesPage,
  JAV_CODES_PER_PAGE,
  copiedGroup,
  setCopiedGroup,
  syncJavCodes,
  handleSearch
}: {
  javCodes: { prefix: string; codes: string[] }[];
  javCodesPage: number;
  setJavCodesPage: (val: number | ((prev: number) => number)) => void;
  JAV_CODES_PER_PAGE: number;
  copiedGroup: string | null;
  setCopiedGroup: (val: string | null) => void;
  syncJavCodes: () => void;
  handleSearch: (query: string, page: number, type: 'movie' | 'actress' | 'studio') => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">Jav Code</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              const allCodes = javCodes.flatMap(g => g.codes).join(' ');
              navigator.clipboard.writeText(allCodes);
              setCopiedGroup('all');
              setTimeout(() => setCopiedGroup(null), 2000);
            }}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-secondary/80 transition"
          >
            {copiedGroup === 'all' ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />} 
            {copiedGroup === 'all' ? 'Copied All!' : 'Copy All Codes'}
          </button>
          <button 
            onClick={syncJavCodes}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 transition"
          >
            <Zap size={18} /> Sync from Movies
          </button>
          <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {javCodes.length} Groups
          </div>
        </div>
      </div>

      {javCodes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {javCodes
              .slice((javCodesPage - 1) * JAV_CODES_PER_PAGE, javCodesPage * JAV_CODES_PER_PAGE)
              .map((group, i) => (
                <div key={i} className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-primary">{group.prefix}</h3>
                      <button 
                        onClick={() => {
                          const text = group.codes.join(' ');
                          navigator.clipboard.writeText(text);
                          setCopiedGroup(group.prefix);
                          setTimeout(() => setCopiedGroup(null), 2000);
                        }}
                        className="p-1.5 hover:bg-accent rounded-md text-muted-foreground transition-colors"
                        title="Copy all codes"
                      >
                        {copiedGroup === group.prefix ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                      {group.codes.length} Codes
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.codes.map((code, j) => (
                      <span 
                        key={j} 
                        className="text-sm bg-muted/50 hover:bg-muted text-foreground px-3 py-1 rounded-full cursor-pointer transition"
                        onClick={() => handleSearch(code, 1, 'movie')}
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {javCodes.length > JAV_CODES_PER_PAGE && (
            <div className="flex justify-center items-center gap-6 mt-12">
              <button
                disabled={javCodesPage === 1}
                onClick={() => setJavCodesPage(prev => prev - 1)}
                className="p-2 rounded-full border border-border hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition"
              >
                <ChevronLeft size={24} />
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.ceil(javCodes.length / JAV_CODES_PER_PAGE) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setJavCodesPage(i + 1)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${javCodesPage === i + 1 ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                    title={`Page ${i + 1}`}
                  />
                ))}
              </div>

              <button
                disabled={javCodesPage >= Math.ceil(javCodes.length / JAV_CODES_PER_PAGE)}
                onClick={() => setJavCodesPage(prev => prev + 1)}
                className="p-2 rounded-full border border-border hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card p-12 rounded-2xl border border-border shadow-sm text-center">
          <Hash size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">No codes found yet. Click "Sync from Movies" to extract codes from your tracked actresses.</p>
        </div>
      )}
    </div>
  );
}
