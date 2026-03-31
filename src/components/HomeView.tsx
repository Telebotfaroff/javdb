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
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#2f2f8c] via-[#5e4ede] to-[#9e66f7] p-8 shadow-xl text-white ring-1 ring-white/10">
          <h1 className="text-3xl font-extrabold sm:text-4xl">JAVDB Studio</h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg text-slate-100/90">
            Discover, search and manage the ultimate JAV movie database with instant Telegram publishing and actress tracking.
            Power up your catalog with rich details and lightning-fast search.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur border border-white/20">
              <p className="text-sm uppercase tracking-wide text-slate-200">Results</p>
              <p className="mt-1 text-2xl font-bold">{results.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur border border-white/20">
              <p className="text-sm uppercase tracking-wide text-slate-200">Page</p>
              <p className="mt-1 text-2xl font-bold">{page}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur border border-white/20">
              <p className="text-sm uppercase tracking-wide text-slate-200">Mode</p>
              <p className="mt-1 text-2xl font-bold">{searchType}</p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-xl bg-white/10 border border-white/20 p-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by ID, title, actress or studio..."
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              />
            </div>
            <button
              onClick={() => handleSearch(query, 1)}
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-base font-semibold text-violet-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"
            >
              <Search size={18} className="mr-2" /> Search
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        {loading && <p className="rounded-xl bg-blue-100/80 p-3 text-center text-blue-700">Searching...</p>}
        {detailsLoading && <p className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-white">Loading details...</p>}
        {error && (
          <div className="rounded-xl bg-red-100/90 border border-red-300 px-6 py-4 text-red-700" role="alert">
            <strong className="font-bold">Error:</strong> {error}
          </div>
        )}

        {results.length === 0 && !loading && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
            <p className="text-xl font-semibold">No results yet</p>
            <p className="mt-2">Try searching by code, title, actress or studio to find the first entries.</p>
          </div>
        )}

        <div className={`mt-8 grid gap-8 ${compactView ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {results.map((movie, index) => (
            <article
              key={`${movie.link}-${index}`}
              className="rounded-3xl bg-white/80 p-0 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-2xl"
            >
              {movie.poster && (
                <div className="overflow-hidden rounded-t-3xl bg-slate-100">
                  <img src={movie.poster} alt={movie.title} className="h-52 w-full object-cover transition duration-300 hover:scale-105" referrerPolicy="no-referrer" />
                </div>
              )}

              <div className="p-5 flex flex-col gap-3">
                <h2 className="text-lg font-bold text-slate-900 line-clamp-2">{movie.title}</h2>
                {!compactView && movie.actress && (
                  <div className="flex flex-wrap gap-2">
                    {splitNames(movie.actress).map((name, i) => (
                      <button
                        key={i}
                        onClick={() => handleSearch(name, 1, 'actress')}
                        className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-200"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}

                {!compactView && (
                  <div className="text-xs text-slate-500">
                    {movie.releaseDate && <p>Released: {movie.releaseDate}</p>}
                    {movie.studio && (
                      <p>
                        Studio: {splitNames(movie.studio).map((name, i, arr) => (
                          <button
                            key={i}
                            onClick={() => handleSearch(name, 1, 'studio')}
                            className="mr-1 text-violet-700 hover:underline"
                          >
                            {name}{i < arr.length - 1 ? ',' : ''}
                          </button>
                        ))}
                      </p>
                    )}
                  </div>
                )}

                {!compactView && movie.plot && <p className="line-clamp-3 text-slate-600">{movie.plot}</p>}

                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => fetchDetails(movie.link)}
                    className="flex-1 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
                  >
                    View
                  </button>
                  {searchType === 'actress' && (
                    <button
                      onClick={() => addActresses(movie.title)}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
                      title="Track actress"
                    >
                      <UserPlus size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => sendToTelegram(movie)}
                    className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700"
                    title="Post to Telegram"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {results.length > 0 && (
          <div className="mt-12 flex justify-center gap-4">
            <button
              disabled={page === 1}
              onClick={() => handleSearch(query, page - 1)}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Previous
            </button>
            <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700">Page {page}</span>
            <button
              onClick={() => handleSearch(query, page + 1)}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </>
  );
}
