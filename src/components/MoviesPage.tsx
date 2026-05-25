import React, { useState } from 'react';
import { Search, Loader2, ArrowLeft, Download, ExternalLink, Image as ImageIcon, Film, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MoviesPageProps {
  darkMode: boolean;
}

export default function MoviesPage({ darkMode }: MoviesPageProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState('');

  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any | null>(null);
  const [scrapeError, setScrapeError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);
    setSelectedMovie(null);
    setScrapeResult(null);

    try {
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to search');
      setSearchResults(data.results || []);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMovieClick = async (movie: any) => {
    setSelectedMovie(movie);
    setIsScraping(true);
    setScrapeError('');
    setScrapeResult(null);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: movie.url, fullPage: false })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch details');
      
      setScrapeResult(data);
    } catch (err: any) {
      setScrapeError(err.message);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header & Search */}
        {!selectedMovie && (
          <div className="space-y-6">
            <div className="text-center space-y-4 mb-4">
              <div className="inline-flex items-center justify-center space-x-3 bg-emerald-500/10 px-4 py-1.5 rounded-full mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Pirate69 Movie Search</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center justify-center gap-3">
                <span className={darkMode ? "text-white" : "text-gray-900"}>Find Any Movie</span>
              </h1>
              <p className={`text-sm md:text-base max-w-lg mx-auto ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Enter a title to instantly search our catalog and extract direct download links. For best results, please try accurate spelling of the movie.
              </p>
            </div>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 mt-8">
              <div className="relative flex-1 group">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-gray-500 group-focus-within:text-emerald-400' : 'text-gray-400 group-focus-within:text-emerald-500'}`} size={20} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Inception, The Batman..."
                  className={`w-full h-14 pl-12 pr-4 rounded-2xl border transition-all text-base ${
                    darkMode 
                      ? 'bg-[#1a1a1a] border-gray-800 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-600' 
                      : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400 shadow-sm'
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className={`w-full sm:w-auto h-14 px-8 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                  isSearching || !query.trim()
                    ? 'opacity-50 cursor-not-allowed bg-emerald-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-lg shadow-emerald-500/25 border-b-4 border-emerald-600'
                }`}
              >
                {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>
            </form>

            {searchError && (
              <div className="max-w-2xl mx-auto p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                {searchError}
              </div>
            )}

            {/* Results Grid */}
            <div className={`mt-10 ${searchResults.length > 0 ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6" : ""}`}>
              {searchResults.map((movie, idx) => (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={idx}
                  onClick={() => handleMovieClick(movie)}
                  className={`relative group rounded-2xl overflow-hidden aspect-[2/3] text-left transition-all hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] border ${
                    darkMode ? 'bg-[#1c1c1f] border-gray-800 hover:border-emerald-500/30' : 'bg-white border-gray-200 hover:border-emerald-500/30'
                  }`}
                >
                  {movie.thumbnail ? (
                    <img src={movie.thumbnail} alt={movie.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <ImageIcon className="text-gray-400" size={32} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-4">
                    <h3 className="text-white font-bold text-sm leading-tight line-clamp-3 group-hover:text-emerald-400 transition-colors">
                      {movie.cleanTitle || movie.title}
                    </h3>
                  </div>
                </motion.button>
              ))}
            </div>
            
            {!isSearching && searchResults.length === 0 && query && !searchError && (
              <div className="text-center py-12 text-gray-500">
                No results found for "{query}". Try a different keyword.
              </div>
            )}
          </div>
        )}

        {/* Detailed View */}
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <button
              onClick={() => setSelectedMovie(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-white border hover:bg-gray-50 text-gray-600'
              }`}
            >
              <ArrowLeft size={16} />
              Back to search
            </button>

            {isScraping ? (
              <div className={`p-12 rounded-3xl border flex flex-col items-center justify-center gap-4 ${
                darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <Loader2 className="animate-spin text-emerald-500" size={48} />
                <p className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Extracting download links for {selectedMovie.cleanTitle}...</p>
                <p className="text-sm text-gray-500">This may take a few seconds as we bypass protections.</p>
              </div>
            ) : scrapeError ? (
              <div className="p-8 rounded-3xl border bg-red-500/10 border-red-500/20 text-center space-y-4">
                <p className="text-red-500 font-bold">{scrapeError}</p>
                <button
                  onClick={() => handleMovieClick(selectedMovie)}
                  className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
                >
                  Retry
                </button>
              </div>
            ) : scrapeResult ? (
              <div className={`rounded-3xl border overflow-hidden ${darkMode ? 'bg-[#111113] border-gray-800' : 'bg-white border-gray-200 shadow-xl'}`}>
                <div className="flex flex-col md:flex-row">
                  {/* Poster Sidebar */}
                  <div className={`w-full md:w-1/3 p-6 flex flex-col items-center gap-6 border-b md:border-b-0 md:border-r ${darkMode ? 'border-gray-800' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl relative bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                       {scrapeResult.poster || selectedMovie.thumbnail ? (
                         <img src={scrapeResult.poster || selectedMovie.thumbnail} alt="Poster" className="w-full h-full object-cover" />
                       ) : (
                         <div className="absolute inset-0 flex items-center justify-center">
                           <ImageIcon className="text-gray-400" size={48} />
                         </div>
                       )}
                    </div>
                    <div className="w-full space-y-3">
                       {scrapeResult.info && Object.entries(scrapeResult.info).slice(0, 5).map(([key, value]) => (
                         <div key={key} className="flex flex-col">
                           <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{key}</span>
                           <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>{String(value)}</span>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="w-full md:w-2/3 p-6 md:p-8 lg:p-10">
                    <h2 className={`text-3xl font-black mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {scrapeResult.cleanTitle || selectedMovie.title}
                    </h2>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b pb-2 border-gray-800/20 dark:border-gray-800">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500">
                          {scrapeResult.downloadLinks && scrapeResult.downloadLinks.length > 0 ? "Download Links" : "No Links Found"}
                        </h3>
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md text-xs font-bold">
                          {scrapeResult.downloadLinks?.length || 0} files
                        </span>
                      </div>

                      {scrapeResult.downloadLinks && scrapeResult.downloadLinks.length > 0 ? (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                          {scrapeResult.downloadLinks.map((link: any, idx: number) => {
                            let hostname = "";
                            try {
                              hostname = new URL(link.url).hostname;
                            } catch (e) {}

                            return (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`group flex items-center justify-between p-4 rounded-2xl border transition-all hover:-translate-y-[2px] ${
                                darkMode 
                                  ? 'bg-[#1c1c1f] border-gray-800 hover:border-emerald-500/50 hover:shadow-[0_8px_20px_rgb(16,185,129,0.1)]' 
                                  : 'bg-white shadow-sm border-gray-200 hover:border-emerald-500 hover:shadow-[0_8px_20px_rgb(16,185,129,0.15)]'
                              }`}
                            >
                              <div className="flex flex-col gap-1 pr-4">
                                <span className={`font-bold line-clamp-2 transition-colors ${darkMode ? 'text-gray-200 group-hover:text-emerald-400' : 'text-gray-700 group-hover:text-emerald-600'}`}>
                                  {link.label || "Download Link"}
                                </span>
                                {hostname && (
                                  <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase flex items-center gap-1">
                                    <Database size={10} />
                                    {hostname}
                                  </span>
                                )}
                              </div>
                              <div className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                                darkMode 
                                  ? 'bg-gray-800 text-gray-300 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/20' 
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 group-hover:shadow-lg group-hover:shadow-emerald-500/20'
                              }`}>
                                <span className="hidden sm:inline">Download</span>
                                <Download size={16} />
                              </div>
                            </a>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 rounded-2xl border border-dashed border-gray-700 text-center">
                          <p className="text-gray-500">We couldn't extract any download links from this page.</p>
                          <a href={selectedMovie.url} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline mt-2 inline-flex items-center gap-1">
                            Visit page directly <ExternalLink size={14} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

      </div>
    </div>
  );
}
