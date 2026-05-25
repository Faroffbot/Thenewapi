import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, Play, Search, Code, Cpu, Book, ArrowRight, CornerDownRight, Loader2, Send } from 'lucide-react';

export default function ApiDocPage({ darkMode }: { darkMode: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'curl' | 'js' | 'python'>('curl');
  
  // Playground States
  const [searchQuery, setSearchQuery] = useState('Batman');
  const [scrapeUrl, setScrapeUrl] = useState('https://vegamovies.market/download-batman-begins-2005-hindi-english-480p-720p-1080p/');
  const [isScrapeFullPage, setIsScrapeFullPage] = useState(false);
  
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [activePlaygroundEndpoint, setActivePlaygroundEndpoint] = useState<'search' | 'scrape' | 'search-scrape' | 'search-formatted'>('search');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  // Dynamic code snippets based on values entered in inputs
  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://YOUR_APP_URL';

  const snippets = {
    search: {
      curl: `curl -X GET "${currentAppUrl}/api/movies/search?q=${encodeURIComponent(searchQuery)}"`,
      js: `const response = await fetch('${currentAppUrl}/api/movies/search?q=${encodeURIComponent(searchQuery)}');
const data = await response.json();
console.log(data);`,
      python: `import requests

url = "${currentAppUrl}/api/movies/search"
params = {"q": "${searchQuery}"}

response = requests.get(url, params=params)
print(response.json())`
    },
    scrape: {
      curl: `curl -X POST "${currentAppUrl}/api/scrape" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "${scrapeUrl}", "fullPage": ${isScrapeFullPage}}'`,
      js: `const response = await fetch('${currentAppUrl}/api/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: "${scrapeUrl}",
    fullPage: ${isScrapeFullPage}
  })
});
const data = await response.json();
console.log(data);`,
      python: `import requests

url = "${currentAppUrl}/api/scrape"
payload = {
    "url": "${scrapeUrl}",
    "fullPage": ${isScrapeFullPage ? 'True' : 'False'}
}

response = requests.post(url, json=payload)
print(response.json())`
    },
    'search-scrape': {
      curl: `curl -X GET "${currentAppUrl}/api/movies/search-scrape?q=${encodeURIComponent(searchQuery)}"`,
      js: `const response = await fetch('${currentAppUrl}/api/movies/search-scrape?q=${encodeURIComponent(searchQuery)}');
const data = await response.json();
console.log(data);`,
      python: `import requests

url = "${currentAppUrl}/api/movies/search-scrape"
params = {"q": "${searchQuery}"}

response = requests.get(url, params=params)
print(response.json())`
    },
    'search-formatted': {
      curl: `curl -X GET "${currentAppUrl}/api/movies/search-formatted?q=${encodeURIComponent(searchQuery)}"`,
      js: `const response = await fetch('${currentAppUrl}/api/movies/search-formatted?q=${encodeURIComponent(searchQuery)}');
const data = await response.json();
console.log(data);`,
      python: `import requests

url = "${currentAppUrl}/api/movies/search-formatted"
params = {"q": "${searchQuery}"}

response = requests.get(url, params=params)
print(response.json())`
    }
  };

  // Execute actual API calls dynamically in the browser
  const handleTestApi = async (endpoint: 'search' | 'scrape' | 'search-scrape' | 'search-formatted') => {
    setPlaygroundLoading(true);
    setPlaygroundResponse(null);
    try {
      if (endpoint === 'search') {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setPlaygroundResponse(data);
      } else if (endpoint === 'search-scrape') {
        const res = await fetch(`/api/movies/search-scrape?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setPlaygroundResponse(data);
      } else if (endpoint === 'search-formatted') {
        const res = await fetch(`/api/movies/search-formatted?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setPlaygroundResponse(data);
      } else {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: scrapeUrl,
            fullPage: isScrapeFullPage
          })
        });
        const data = await res.json();
        setPlaygroundResponse(data);
      }
    } catch (err: any) {
      setPlaygroundResponse({
        error: "Failed to communicate with API",
        details: err.message
      });
    } finally {
      setPlaygroundLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header Info */}
      <div className={`p-8 rounded-3xl border shadow-sm transition-all duration-300 ${
        darkMode ? 'bg-gradient-to-br from-[#1c1c1f] to-[#121214] border-gray-800' : 'bg-gradient-to-br from-white to-gray-50 border-gray-100'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Code size={24} />
              </span>
              <h1 className={`text-4xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>VegaScraper Developer API</h1>
            </div>
            <p className={`text-base leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Connect external tools or build programmatic integrations. Search or scrape any supported film website in real-time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
            }`}>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              API Online
            </span>
            <span className={`text-xs px-3 py-1 rounded-full border ${
              darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'
            }`}>
              v1.1.0
            </span>
          </div>
        </div>
        
        {/* Base URL details */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border ${
          darkMode ? 'bg-black/45 border-gray-800' : 'bg-gray-100/50 border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold uppercase bg-blue-500 text-white px-2 py-0.5 rounded-md tracking-wider">Base URL</span>
            <code className="text-sm font-mono text-blue-500 break-all">{currentAppUrl}</code>
          </div>
          <button 
            onClick={() => copyToClipboard(currentAppUrl)}
            className={`flex items-center gap-2 px-3 py-1.5 h-9 rounded-xl text-xs font-bold transition-all shrink-0 ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-white hover:bg-gray-100 text-gray-700 shadow-sm border border-gray-200'
            }`}
          >
            {copied === currentAppUrl ? (
              <>
                <Check size={14} className="text-green-500" />
                <span>Copied Base URL</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Base URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Documentation Column */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-12">
          
          {/* Smart Search Docs */}
          <div className={`p-8 rounded-3xl border shadow-sm ${darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'}`}>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-500">ENDPOINT 1</span>
            
            <div className="flex flex-wrap items-center gap-3 mt-2 mb-4">
              <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-blue-500/10 text-blue-500 border border-blue-500/20">GET</span>
              <code className={`text-lg font-bold font-mono ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>/api/movies/search</code>
            </div>

            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Look up film listings directly across the active providers in real-time. This searches on-demand and parses the matching listings with title cleaning and metadata attachment instantly.
            </p>

            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Request Query Parameters</h3>
            <div className={`border rounded-2xl overflow-hidden mb-6 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <table className="w-full text-sm text-left">
                <thead className={darkMode ? 'bg-black/30 text-gray-400 border-b border-gray-800' : 'bg-gray-50 text-gray-500 border-b border-gray-200'}>
                  <tr>
                    <th className="px-4 py-3 font-medium">Parameter</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Required</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-800 text-gray-300' : 'divide-gray-200 text-gray-600'}`}>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-blue-500 font-bold">q</td>
                    <td className="px-4 py-3 text-xs italic">string</td>
                    <td className="px-4 py-3 text-xs"><span className="text-red-500 font-bold">Yes</span></td>
                    <td className="px-4 py-3 text-xs">The movie search keyword (e.g. <code>Avengers</code>).</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setActivePlaygroundEndpoint('search');
                  const section = document.getElementById('api-playground');
                  if (section) section.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Play size={12} />
                <span>Test in Playground</span>
              </button>
            </div>
          </div>

          {/* Scrape Docs */}
          <div className={`p-8 rounded-3xl border shadow-sm ${darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'}`}>
            <span className="text-xs font-bold uppercase tracking-widest text-purple-500">ENDPOINT 2</span>
            
            <div className="flex flex-wrap items-center gap-3 mt-2 mb-4">
              <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">POST</span>
              <code className={`text-lg font-bold font-mono ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>/api/scrape</code>
            </div>

            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Sends an on-demand extractor to scour any target post or list URL. It pulls down metadata, posters, detailed descriptors, and parses underlying download links in a clean structure.
            </p>

            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>POST Payload Body (JSON)</h3>
            <div className={`border rounded-2xl overflow-hidden mb-6 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <table className="w-full text-sm text-left">
                <thead className={darkMode ? 'bg-black/30 text-gray-400 border-b border-gray-800' : 'bg-gray-50 text-gray-500 border-b border-gray-200'}>
                  <tr>
                    <th className="px-4 py-3 font-medium">Field</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Required</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-800 text-gray-300' : 'divide-gray-200 text-gray-600'}`}>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-purple-500 font-bold">url</td>
                    <td className="px-4 py-3 text-xs italic">string</td>
                    <td className="px-4 py-3 text-xs"><span className="text-red-500 font-bold">Yes</span></td>
                    <td className="px-4 py-3 text-xs">Valid movie post URL or listing page to extract data from.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-purple-500">fullPage</td>
                    <td className="px-4 py-3 text-xs italic">boolean</td>
                    <td className="px-4 py-3 text-xs"><span className="text-gray-400">No (false)</span></td>
                    <td className="px-4 py-3 text-xs">If true, recursively scrapes additional internal page content, HTML previews, and fully expanded metadata lists.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setActivePlaygroundEndpoint('scrape');
                  const section = document.getElementById('api-playground');
                  if (section) section.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Play size={12} />
                <span>Test in Playground</span>
              </button>
            </div>
          </div>

          {/* Search Scrape Docs */}
          <div className={`p-8 rounded-3xl border shadow-sm ${darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'}`}>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">ENDPOINT 3</span>
            
            <div className="flex flex-wrap items-center gap-3 mt-2 mb-4">
              <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">GET</span>
              <code className={`text-lg font-bold font-mono ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>/api/movies/search-scrape</code>
            </div>

            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Look up film listings and automatically deep-scrape the top 10 results to retrieve direct download links, quality info, and full metadata all in one call. Note: This can take 5-15 seconds to return.
            </p>

            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Request Query Parameters</h3>
            <div className={`border rounded-2xl overflow-hidden mb-6 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <table className="w-full text-sm text-left">
                <thead className={darkMode ? 'bg-black/30 text-gray-400 border-b border-gray-800' : 'bg-gray-50 text-gray-500 border-b border-gray-200'}>
                  <tr>
                    <th className="px-4 py-3 font-medium">Parameter</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Required</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-800 text-gray-300' : 'divide-gray-200 text-gray-600'}`}>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-500 font-bold">q</td>
                    <td className="px-4 py-3 text-xs italic">string</td>
                    <td className="px-4 py-3 text-xs"><span className="text-red-500 font-bold">Yes</span></td>
                    <td className="px-4 py-3 text-xs">The movie search keyword (e.g. <code>Batman</code>).</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setActivePlaygroundEndpoint('search-scrape');
                  const section = document.getElementById('api-playground');
                  if (section) section.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Play size={12} />
                <span>Test in Playground</span>
              </button>
            </div>
          </div>

          {/* Formatted Search Docs */}
          <div className={`p-8 rounded-3xl border shadow-sm ${darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'}`}>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-500">ENDPOINT 4</span>
            
            <div className="flex flex-wrap items-center gap-3 mt-2 mb-4">
              <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20">GET</span>
              <code className={`text-lg font-bold font-mono ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>/api/movies/search-formatted</code>
            </div>

            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Look up film listings and automatically deep-scrape the top 10 results, returning the download links pre-categorized perfectly into distinct resolution groups like 480p, 720p, 1080p, and 4K. Ideal for Telegram bots or categorized UI lists.
            </p>

            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Request Query Parameters</h3>
            <div className={`border rounded-2xl overflow-hidden mb-6 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <table className="w-full text-sm text-left">
                <thead className={darkMode ? 'bg-black/30 text-gray-400 border-b border-gray-800' : 'bg-gray-50 text-gray-500 border-b border-gray-200'}>
                  <tr>
                    <th className="px-4 py-3 font-medium">Parameter</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Required</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-800 text-gray-300' : 'divide-gray-200 text-gray-600'}`}>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-amber-500 font-bold">q</td>
                    <td className="px-4 py-3 text-xs italic">string</td>
                    <td className="px-4 py-3 text-xs"><span className="text-red-500 font-bold">Yes</span></td>
                    <td className="px-4 py-3 text-xs">The movie search keyword (e.g. <code>Batman</code>).</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setActivePlaygroundEndpoint('search-formatted');
                  const section = document.getElementById('api-playground');
                  if (section) section.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Play size={12} />
                <span>Test in Playground</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Side: Code snippets & Playground Sandbox Column */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          
          {/* Code Samples Panel */}
          <div className={`p-6 rounded-3xl border shadow-sm flex flex-col transition-all overflow-hidden ${
            darkMode ? 'bg-black border-gray-800' : 'bg-gray-900 border-gray-950 text-gray-100'
          }`}>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-300">Request Snippets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveLang('curl')}
                  className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all ${
                    activeLang === 'curl' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setActiveLang('js')}
                  className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all ${
                    activeLang === 'js' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Fetch
                </button>
                <button
                  onClick={() => setActiveLang('python')}
                  className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all ${
                    activeLang === 'python' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Python
                </button>
              </div>
            </div>

            {/* Snippet Header & Toggles for endpoints */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <button 
                onClick={() => setActivePlaygroundEndpoint('search')}
                className={`text-xs font-bold tracking-wider py-1 border-b-2 transition-all ${
                  activePlaygroundEndpoint === 'search' 
                    ? 'border-blue-500 text-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                Search
              </button>
              <button 
                onClick={() => setActivePlaygroundEndpoint('scrape')}
                className={`text-xs font-bold tracking-wider py-1 border-b-2 transition-all ${
                  activePlaygroundEndpoint === 'scrape' 
                    ? 'border-purple-500 text-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                Scrape
              </button>
              <button 
                onClick={() => setActivePlaygroundEndpoint('search-scrape')}
                className={`text-xs font-bold tracking-wider py-1 border-b-2 transition-all ${
                  activePlaygroundEndpoint === 'search-scrape' 
                    ? 'border-emerald-500 text-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                Search + Scrape
              </button>
            </div>

            {/* Snippet box */}
            <div className="relative">
              <button 
                onClick={() => copyToClipboard(snippets[activePlaygroundEndpoint][activeLang])}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all border border-gray-700/50"
                title="Copy code"
              >
                {copied === snippets[activePlaygroundEndpoint][activeLang] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
              <pre className="text-xs font-mono p-4 bg-[#0d0d0f] rounded-2xl overflow-x-auto text-blue-300 leading-relaxed border border-gray-800/60 custom-scrollbar max-h-[220px]">
                <code>{snippets[activePlaygroundEndpoint][activeLang]}</code>
              </pre>
            </div>
          </div>

          {/* Interactive Playground Section */}
          <div id="api-playground" className={`p-6 rounded-3xl border shadow-md flex flex-col transition-all ${
            darkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Send size={16} className="text-green-500 animate-pulse" />
                <h2 className={`text-sm font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-gray-800'}`}>Interactive Playground</h2>
              </div>
              <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => { setActivePlaygroundEndpoint('search'); setPlaygroundResponse(null); }}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    activePlaygroundEndpoint === 'search' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  GET Search
                </button>
                <button
                  type="button"
                  onClick={() => { setActivePlaygroundEndpoint('scrape'); setPlaygroundResponse(null); }}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    activePlaygroundEndpoint === 'scrape' 
                      ? 'bg-purple-500 text-white' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  POST Scrape
                </button>
                <button
                  type="button"
                  onClick={() => { setActivePlaygroundEndpoint('search-scrape'); setPlaygroundResponse(null); }}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    activePlaygroundEndpoint === 'search-scrape' 
                      ? 'bg-emerald-500 text-white' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  GET Search+Scrape
                </button>
                <button
                  type="button"
                  onClick={() => { setActivePlaygroundEndpoint('search-formatted'); setPlaygroundResponse(null); }}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    activePlaygroundEndpoint === 'search-formatted' 
                      ? 'bg-amber-500 text-white' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  GET Formatted
                </button>
              </div>
            </div>

            {/* Inputs based on selection */}
            <div className="space-y-4 mb-4">
              {activePlaygroundEndpoint === 'search' || activePlaygroundEndpoint === 'search-scrape' || activePlaygroundEndpoint === 'search-formatted' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-500">Query Parameter (q)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-1 transition-colors ${
                        darkMode ? 'bg-black border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                      } ${activePlaygroundEndpoint === 'search-scrape' ? 'focus:border-emerald-500 focus:ring-emerald-500' : activePlaygroundEndpoint === 'search-formatted' ? 'focus:border-amber-500 focus:ring-amber-500' : 'focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="Type movie keyword..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-500">Scrape Target URL (url)</label>
                    <input 
                      type="url" 
                      value={scrapeUrl}
                      onChange={(e) => setScrapeUrl(e.target.value)}
                      className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors font-mono ${
                        darkMode ? 'bg-black border-gray-800 text-white focus:border-purple-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500'
                      }`}
                      placeholder="Enter a vegamovies post URL..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="fullPageCheck"
                      checked={isScrapeFullPage}
                      onChange={(e) => setIsScrapeFullPage(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="fullPageCheck" className="text-xs font-medium text-gray-500 cursor-pointer">
                      Enable <code>fullPage</code> Recursive Scraping Mode
                    </label>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleTestApi(activePlaygroundEndpoint)}
                disabled={playgroundLoading}
                className={`w-full py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 ${
                  playgroundLoading 
                    ? 'bg-gray-500 text-white cursor-not-allowed opacity-50' 
                    : activePlaygroundEndpoint === 'search'
                      ? 'bg-blue-500 hover:bg-blue-600 text-white active:scale-[0.98]'
                      : activePlaygroundEndpoint === 'search-formatted'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white active:scale-[0.98]'
                      : activePlaygroundEndpoint === 'search-scrape'
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-[0.98]'
                        : 'bg-purple-500 hover:bg-purple-600 text-white active:scale-[0.98]'
                }`}
              >
                {playgroundLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Processing live scrape request...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Send Request to Live API</span>
                  </>
                )}
              </button>
            </div>

            {/* Live sandbox result display */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sandbox JSON Output</span>
                {playgroundResponse && (
                  <button 
                    onClick={() => copyToClipboard(JSON.stringify(playgroundResponse, null, 2))}
                    className="text-[10px] flex items-center gap-1 text-blue-500 hover:underline hover:text-blue-600"
                  >
                    <Copy size={10} />
                    <span>Copy JSON</span>
                  </button>
                )}
              </div>
              <div className={`p-4 rounded-xl border font-mono text-xs overflow-auto max-h-[350px] leading-relaxed custom-scrollbar ${
                darkMode ? 'bg-black border-gray-800 text-green-400' : 'bg-gray-50 border-gray-100 text-gray-800'
              }`}>
                {playgroundLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 dark:text-gray-500">
                    <Loader2 className="animate-spin text-blue-500" size={24} />
                    <span>Scraping movie sites directly...</span>
                  </div>
                ) : playgroundResponse ? (
                  <pre><code>{JSON.stringify(playgroundResponse, null, 2)}</code></pre>
                ) : (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500 italic">
                    Customize parameter inputs above and send a live request to preview returned data.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
