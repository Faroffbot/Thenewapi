import ApiDocPage from './components/ApiDocPage';
import MoviesPage from './components/MoviesPage';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Search, Loader2, ExternalLink, Download, Image as ImageIcon, Info, Film, AlertCircle, X, Copy, Check, Menu, Database, Zap, Settings, Home, Trash2, Moon, Sun, Bot, Play, Square, FileJson, List, LogIn, LogOut, Save, Edit, Trash, BookOpen, Code, Terminal, History } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

interface ScrapedData {
  title: string;
  poster: string;
  info: Record<string, string>;
  downloadLinks: { label: string; url: string }[];
  nextPageUrl?: string | null;
  url?: string;
  results?: { 
    title: string; 
    thumbnail: string; 
    url: string;
    downloadLinks?: { label: string; url: string }[];
    info?: Record<string, string>;
    poster?: string;
  }[];
  fullContent?: {
    links: { text: string; href: string }[];
    images: string[];
    text: string[];
    html: string;
  };
}

export default function App() {
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [extractionMode, setExtractionMode] = useState<'url' | 'search'>('url');
  const [loading, setLoading] = useState(false);
  const [fullPage, setFullPage] = useState(false);
  const [data, setData] = useState<ScrapedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'movie' | 'full' | 'results' | 'json'>('movie');
  const [copiedIndex, setCopiedIndex] = useState<number | string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<ScrapedData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);
  const [view, setView] = useState<'home' | 'settings' | 'autoscrape' | 'api-docs' | 'dochelp' | 'movies'>('movies');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [recentScrapes, setRecentScrapes] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentScrapes');
    return saved ? JSON.parse(saved) : [];
  });

  const [user, setUser] = useState<any | null>(null);
  const [duplicateUrls, setDuplicateUrls] = useState<Set<string>>(new Set());

  // Autoscrape States
  const [autoScrapeUrl, setAutoScrapeUrl] = useState('');
  const [autoScrapeHistory, setAutoScrapeHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('autoScrapeHistory') || '[]'); } catch { return []; }
  });
  const [isAutoScraping, setIsAutoScraping] = useState(false);
  const [autoScrapeResults, setAutoScrapeResults] = useState<any[]>([]);
  const [autoScrapeLogs, setAutoScrapeLogs] = useState<string[]>([]);
  const shouldStopAutoScrape = useRef(false);

  // Database View States
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbCurrentPage, setDbCurrentPage] = useState(1);
  const DB_ITEMS_PER_PAGE = 20;

  // Edit and Delete States
  const [editingMovie, setEditingMovie] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: '', poster: '', description: '' });
  const [movieToDelete, setMovieToDelete] = useState<any | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  
  
  

  const addAutoScrapeLog = (message: string) => {
    setAutoScrapeLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const toggleAutoScrape = async () => {
    if (isAutoScraping) {
      shouldStopAutoScrape.current = true;
      setIsAutoScraping(false);
      addAutoScrapeLog('Stopping autoscrape...');
      return;
    }

    const urls = autoScrapeUrl.split('\n').map(u => u.trim()).filter(u => u);

    if (urls.length === 0) {
      addAutoScrapeLog('Please enter at least one valid URL.');
      return;
    }

    const newHistory = Array.from(new Set([...urls, ...autoScrapeHistory])).slice(0, 50);
    setAutoScrapeHistory(newHistory);
    localStorage.setItem('autoScrapeHistory', JSON.stringify(newHistory));

    setIsAutoScraping(true);
    shouldStopAutoScrape.current = false;
    setAutoScrapeResults([]);
    setAutoScrapeLogs([]);

    const scrapeTask = async (startUrl: string, taskId: number) => {
      let currentUrl = startUrl;
      let pageCount = 0;

      addAutoScrapeLog(`Task ${taskId}: Starting at ${currentUrl}`);

      while (currentUrl && !shouldStopAutoScrape.current) {
        pageCount++;
        addAutoScrapeLog(`Task ${taskId}: Scraping page ${pageCount}: ${currentUrl}...`);
        try {
          const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: currentUrl, fullPage: true }),
          });
          const result = await response.json();

          if (!response.ok) throw new Error(result.error || 'Failed');

          const newMovies = result.results || [];
          addAutoScrapeLog(`Task ${taskId}: Found ${newMovies.length} movies on page ${pageCount}.`);

          setAutoScrapeResults(prev => {
              const prevUrls = new Set(prev.map(m => m.url));
              const uniqueNewMovies = newMovies.filter((m: any) => !prevUrls.has(m.url));
              return [...prev, ...uniqueNewMovies];
          });

          if (result.nextPageUrl && result.nextPageUrl !== currentUrl) {
            currentUrl = result.nextPageUrl;
            addAutoScrapeLog(`Task ${taskId}: Next page found. Waiting 3 seconds...`);
            await new Promise(res => setTimeout(res, 3000)); // Delay to prevent rate limiting
          } else {
            addAutoScrapeLog(`Task ${taskId}: No next page found. Task complete.`);
            break;
          }
        } catch (err: any) {
          addAutoScrapeLog(`Task ${taskId}: Error on page ${pageCount}: ${err.message}`);
          break;
        }
      }
      return pageCount;
    };

    try {
      const promises = urls.map((url, i) => scrapeTask(url, i + 1));
      const results = await Promise.all(promises);
      const totalPages = results.reduce((sum, count) => sum + count, 0);
      
      if (!shouldStopAutoScrape.current) {
        addAutoScrapeLog(`Autoscrape finished successfully. Total pages processed: ${totalPages}.`);
      } else {
        addAutoScrapeLog(`Autoscrape stopped by user.`);
      }
    } catch (err: any) {
      addAutoScrapeLog(`Autoscrape encountered critical error: ${err.message}`);
    } finally {
      setIsAutoScraping(false);
    }
  };

  const handleScrape = async (e?: React.FormEvent, targetUrl?: string, fullPageOverride?: boolean, targetTab?: 'movie' | 'full' | 'results' | 'json') => {
    if (e) e.preventDefault();
    
    let finalUrl = targetUrl;
    let isCombinedSearch = false;
    let currentSearchQuery = searchQuery;

    if (!finalUrl && extractionMode === 'search' && searchQuery) {
      isCombinedSearch = true;
    } else if (finalUrl?.startsWith('Search: ')) {
      isCombinedSearch = true;
      currentSearchQuery = finalUrl.replace('Search: ', '');
      setSearchQuery(currentSearchQuery);
      setExtractionMode('search');
    }

    if (isCombinedSearch) {
      if (!currentSearchQuery) return;
      
      const vegaUrl = `https://vegamovies.mq/search.html?q=${encodeURIComponent(currentSearchQuery)}`;
      const rogUrl = `https://rogmovies.blog/search.html?q=${encodeURIComponent(currentSearchQuery)}`;
      
      const isFullPage = fullPageOverride !== undefined ? fullPageOverride : fullPage;
      setFullPage(isFullPage);

      setLoading(true);
      setError(null);
      setData(null);

      setRecentScrapes(prev => {
        const searchLabel = `Search: ${currentSearchQuery}`;
        const updated = [searchLabel, ...prev.filter(u => u !== searchLabel)].slice(0, 5);
        localStorage.setItem('recentScrapes', JSON.stringify(updated));
        return updated;
      });

      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(currentSearchQuery)}`);
        const json = await res.json();
        
        if (!res.ok) {
          throw new Error(json.error || 'Search failed');
        }

        setData(json);

        if (targetTab) {
          setActiveTab(targetTab);
        } else {
          setActiveTab('results');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!finalUrl) {
      finalUrl = url;
    }
    
    if (!finalUrl) return;

    const isFullPage = fullPageOverride !== undefined ? fullPageOverride : fullPage;
    setFullPage(isFullPage);

    setLoading(true);
    setError(null);
    setData(null);

    // Add to recent scrapes
    setRecentScrapes(prev => {
      const updated = [finalUrl, ...prev.filter(u => u !== finalUrl)].slice(0, 5);
      localStorage.setItem('recentScrapes', JSON.stringify(updated));
      return updated;
    });

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl, fullPage: isFullPage }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to scrape');
      }

      const resolvedUrl = result.url || finalUrl;
      setData({ ...result, url: resolvedUrl });

      if (targetTab) {
        setActiveTab(targetTab);
      } else if (result.results && result.results.length > 0 && !result.poster) {
        setActiveTab('results');
      } else if (isFullPage) {
        setActiveTab('full');
      } else {
        setActiveTab('movie');
      }
      
      if (targetUrl) setUrl(targetUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLoadMore = async () => {
    if (!data?.nextPageUrl || loadingMore) return;

    setLoadingMore(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.nextPageUrl, fullPage }),
      });

      const result = await response.json();

      if (response.ok) {
        setData(prev => {
          if (!prev) return result;
          return {
            ...result,
            results: [...(prev.results || []), ...(result.results || [])]
          };
        });
      }
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchQuickView = async (targetUrl: string) => {
    setModalLoading(true);
    setSelectedMovie(null);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, fullPage: false }),
      });
      const result = await response.json();
      if (response.ok) {
        const resolvedUrl = result.url || targetUrl;
        const movieData = { ...result, url: resolvedUrl };
        setSelectedMovie(movieData);
      }
    } catch (err) {
      console.error('Quick view error:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleMovieClick = (item: any) => {
    if (item.downloadLinks && item.info) {
      setSelectedMovie(item);
    } else {
      fetchQuickView(item.url);
    }
  };

  const copyToClipboard = (text: string, index: number | string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    if (!user) return;
    
    const checkDuplicates = async () => {
      const urlsToCheck = [];
      if (data?.url && !data.results) urlsToCheck.push(data.url);
      if (data?.results) {
        urlsToCheck.push(...data.results.map((m: any) => m.url));
      }
      if (autoScrapeResults.length > 0) {
        urlsToCheck.push(...autoScrapeResults.map((m: any) => m.url));
      }
      if (selectedMovie?.url) {
        urlsToCheck.push(selectedMovie.url);
      }
      
      if (urlsToCheck.length === 0) return;
      
      try {
        const existing = await checkExistingUrls(urlsToCheck);
        setDuplicateUrls(prev => {
          const next = new Set(prev);
          existing.forEach((u: string) => next.add(u));
          return next;
        });
      } catch (err) {
         console.error(err);
      }
    };
    checkDuplicates();
  }, [data, autoScrapeResults, selectedMovie, user]);

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-200 flex flex-col transition-colors duration-300 ${darkMode ? 'bg-[#0f0f0f] text-gray-100' : 'bg-[#f5f5f5] text-[#1a1a1a]'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-20 transition-colors ${darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Film size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Pirate69 Movie</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setDarkMode(!darkMode);
                localStorage.setItem('darkMode', JSON.stringify(!darkMode));
              }}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className={`hidden md:block text-[10px] font-mono uppercase tracking-[0.2em] border-l pl-4 ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
              v1.2.0 / Production
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Main Content */}
        <main className={`w-full overflow-y-auto custom-scrollbar transition-colors ${darkMode ? 'bg-[#0f0f0f]' : 'bg-gray-50/50'}`}>
          <div className="max-w-6xl w-full mx-auto px-4 py-8 md:py-12">
            {view === 'movies' ? (
              <motion.div
                key="movies-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto"
              >
                <MoviesPage darkMode={darkMode} />
              </motion.div>
            ) : view === 'api-docs' ? (
              <motion.div
                key="docs-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto"
              >
                <ApiDocPage darkMode={darkMode} />
              </motion.div>
            ) : null}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className={`border-t py-6 transition-colors ${darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            &copy; {new Date().getFullYear()} Pirate69 Movie. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setView('movies')}
              className={`text-sm font-medium transition-colors ${
                view === 'movies'
                  ? (darkMode ? 'text-white' : 'text-gray-900')
                  : (darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => setView('api-docs')}
              className={`text-sm font-medium flex items-center gap-2 transition-colors ${
                view === 'api-docs'
                  ? (darkMode ? 'text-white' : 'text-gray-900')
                  : (darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
              }`}
            >
              <Code size={16} />
              API Docs
            </button>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImage(null)}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
          >
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X size={24} />
            </motion.button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={fullscreenImage}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Movie Modal */}
      <AnimatePresence>
        {editingMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden ${darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white'}`}
            >
              <div className={`p-6 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Edit Movie</h3>
                <button onClick={() => setEditingMovie(null)} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    className={`w-full h-12 px-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                      darkMode ? 'bg-[#222] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Poster URL</label>
                  <input
                    type="text"
                    value={editForm.poster}
                    onChange={(e) => setEditForm({...editForm, poster: e.target.value})}
                    className={`w-full h-12 px-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                      darkMode ? 'bg-[#222] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    rows={4}
                    className={`w-full p-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none ${
                      darkMode ? 'bg-[#222] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>
              <div className={`p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-gray-800 bg-[#222]' : 'border-gray-100 bg-gray-50'}`}>
                <button
                  onClick={() => setEditingMovie(null)}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateMovie}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {bulkDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white'}`}
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Delete Multiple Movies?</h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                  Are you sure you want to delete <span className="font-bold">{selectedMovieIds.length} selected movies</span>? This action cannot be undone.
                </p>
              </div>
              <div className={`p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-gray-800 bg-[#222]' : 'border-gray-100 bg-gray-50'}`}>
                <button
                  onClick={() => setBulkDeleteConfirm(false)}
                  disabled={isBulkDeleting}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center gap-2"
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete All</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {movieToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white'}`}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash size={32} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Delete Movie?</h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                  Are you sure you want to delete <span className="font-bold">"{movieToDelete.title}"</span>? This action cannot be undone.
                </p>
              </div>
              <div className={`p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-gray-800 bg-[#222]' : 'border-gray-100 bg-gray-50'}`}>
                <button
                  onClick={() => setMovieToDelete(null)}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMovie}
                  className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
