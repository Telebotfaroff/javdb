import { AlertCircle, Trash2, Search, CheckCircle2 } from 'lucide-react';

export function NotFoundView({
  notFoundItems,
  clearAllNotFound,
  handleSearch,
  deleteNotFound
}: {
  notFoundItems: any[];
  clearAllNotFound: () => void;
  handleSearch: (query: string, page: number, type: 'movie' | 'actress' | 'studio') => void;
  deleteNotFound: (code: string) => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <AlertCircle className="text-destructive" size={32} /> Not Found IDs
          </h2>
          <p className="text-muted-foreground mt-1">Video IDs that could not be found during autoposting.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={clearAllNotFound}
            disabled={notFoundItems.length === 0}
            className="flex items-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-2 rounded-xl font-semibold transition disabled:opacity-50"
          >
            <Trash2 size={18} /> Clear All
          </button>
          <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
            {notFoundItems.length} Total
          </div>
        </div>
      </div>

      {notFoundItems.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-bottom border-border">
                  <th className="p-4 font-bold text-sm">Video ID</th>
                  <th className="p-4 font-bold text-sm">Query</th>
                  <th className="p-4 font-bold text-sm">Found Date</th>
                  <th className="p-4 font-bold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {notFoundItems.map((item, index) => (
                  <tr key={index} className="hover:bg-accent/50 transition-colors group">
                    <td className="p-4">
                      <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded">{item.code}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">{item.query}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleSearch(item.code, 1, 'movie')}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition"
                          title="Retry Search"
                        >
                          <Search size={16} />
                        </button>
                        <button 
                          onClick={() => deleteNotFound(item.code)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition"
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card p-16 rounded-3xl border border-border shadow-sm text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-bold mb-2">No missing IDs!</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            All video IDs searched during autoposting were successfully found and posted.
          </p>
        </div>
      )}
    </div>
  );
}
