import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as cheerio from "cheerio";
import cors from "cors";
import path from "path";
import fs from "fs";
import TelegramBot from "node-telegram-bot-api";

const botSearchCache = new Map<string, string>();
let proxyList: string[] = [];

async function fetchProxies() {
  try {
    const res = await axios.get('https://raw.githubusercontent.com/dpangestuw/Free-Proxy/main/http_proxies.txt');
    proxyList = res.data.split('\n').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
    console.log(`Loaded ${proxyList.length} HTTP proxies.`);
  } catch (err) {
    console.error('Failed to fetch proxy list:', err);
  }
}

// Fetch proxies initially and refresh every hour
fetchProxies();
setInterval(fetchProxies, 60 * 60 * 1000);

function getRandomProxy(): HttpsProxyAgent<string> | undefined {
  if (proxyList.length === 0) return undefined;
  const proxyStr = proxyList[Math.floor(Math.random() * proxyList.length)];
  return new HttpsProxyAgent(`http://${proxyStr}`);
}

async function fetchWithProxyRetry(url: string, retries = 3): Promise<any> {
  try {
    console.log(`Fetching ${url}`);
    return await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });
  } catch (e: any) {
    if (retries <= 0 || !axios.isAxiosError(e) || e.response?.status === 404) {
      throw e;
    }

    console.log(`Failed fetching ${url}, retrying... (${retries} left). Reason: ${e.message}`);

    if (retries === 3) {
      try {
        console.log(`Trying codetabs proxy for ${url}`);
        const res = await axios.get('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url), { timeout: 15000 });
        // Mock responseUrl to be the original url to avoid baseUrl issues
        if (res.request && res.request.res) {
          res.request.res.responseUrl = url;
        } else {
          res.request = { res: { responseUrl: url } };
        }
        return res;
      } catch (err) {
        return fetchWithProxyRetry(url, retries - 1);
      }
    } else if (retries === 2) {
      try {
        console.log(`Trying allorigins proxy for ${url}`);
        const res = await axios.get('https://api.allorigins.win/get?url=' + encodeURIComponent(url), { timeout: 15000 });
        return { data: res.data.contents, request: { res: { responseUrl: url } } };
      } catch (err) {
        return fetchWithProxyRetry(url, retries - 1);
      }
    } else {
      const httpsAgent = getRandomProxy();
      try {
        console.log(`Trying free IP proxy for ${url}`);
        const res = await axios.get(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
          timeout: 15000,
          httpsAgent,
        });
        return res;
      } catch (proxyError) {
        return fetchWithProxyRetry(url, retries - 1);
      }
    }
  }
}

// Removed Firebase imports and initialization

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Helper to check for excluded domains
  const isExcludedUrl = (href: string) => {
    const excludedDomains = [
      "vegamovies",
      "telegram.me",
      "t.me",
      "t.co",
      "facebook.com",
      "twitter.com",
      "instagram.com",
      "youtube.com",
      "whatsapp.com",
      "pinterest.com",
      "linkedin.com",
      "discord.gg",
      "discord.com",
      "apk-download",
      "play.google.com",
      "apps.apple.com",
      "imdb.com",
      "1xbet",
      "betway",
      "casino"
    ];
    return excludedDomains.some(domain => href.toLowerCase().includes(domain.toLowerCase()));
  };

  const getCleanTitle = (title: string) => {
    let clean = title.replace(/^Download\s+/i, '');
    const yearMatch = clean.match(/\s*(?:\(\d{4}\)|\[\d{4}\])/);
    if (yearMatch && yearMatch.index !== undefined) {
      clean = clean.substring(0, yearMatch.index).trim();
    } else {
      clean = clean.split(/\s+(Blu-Ray|480p|720p|1080p|2160p|Dual Audio|WEB-DL|HDRip|HDTV|CAMRip|x264|x265)/i)[0].trim();
    }
    return clean;
  };

  // Helper to extract movie details from a single page
  const extractMovieDetails = async ($: cheerio.CheerioAPI, url: string, baseUrl: string) => {
    // 1. Precise Title Extraction
    const title = $("h1.post-title").text().trim() || $("h1.entry-title").text().trim() || $("title").text().trim();
    const cleanTitle = getCleanTitle(title);
    
    // 2. Poster Extraction
    let poster = "";
    try {
      const jsonLd = $('script[type="application/ld+json"]');
      jsonLd.each((_, el) => {
        const content = JSON.parse($(el).html() || "{}");
        const graph = content["@graph"] || [content];
        const article = graph.find((item: any) => 
          item["@type"] === "BlogPosting" || 
          item["@type"] === "Article" || 
          item["@type"] === "Movie" ||
          item["@type"] === "VideoObject"
        );
        if (article?.image?.url) poster = article.image.url;
        else if (article?.image) {
          if (typeof article.image === 'string') poster = article.image;
          else if (Array.isArray(article.image)) poster = article.image[0];
        }
      });
    } catch (e) {}

    if (!poster) {
      poster = $('meta[property="og:image"]').attr('content') || 
               $('meta[name="twitter:image"]').attr('content') || 
               $('link[rel="image_src"]').attr('href') || "";
    }
    
    if (!poster) {
      const posterImg = $(".wp-post-image, .attachment-post-thumbnail, .featured-image img, .post-thumbnail img").first();
      poster = posterImg.attr("src") || posterImg.attr("data-src") || "";
    }

    if (!poster) {
      const firstImg = $(".page-body img, .entry-content img, article img").first();
      poster = firstImg.attr("src") || firstImg.attr("data-src") || "";
    }

    if (poster && !poster.startsWith("http") && !poster.startsWith("data:")) {
      poster = new URL(poster, baseUrl).href;
    }
    
    // 3. Metadata Extraction
    const info: Record<string, string> = {};
    
    const metadataSelectors = [
      ".page-body p", ".entry-content p", ".page-body li", ".entry-content li",
      ".mvic-info p", ".movie-info p", ".info-split p", ".imdb-info p",
      "div[class*='info'] p", "div[class*='info'] li",
      ".elementor-widget-text-editor p", ".elementor-widget-text-editor li",
      ".post-content p", ".post-content li", ".article-content p", ".article-content li"
    ].join(", ");

    $(metadataSelectors).each((_, el) => {
      // Skip if this element is inside a comments section
      if ($(el).closest('[class*="comment"], [id*="comment"], .reply').length > 0) return;

      let text = $(el).text().trim();
      
      // Sometimes labels are in strong/b tags, ensure we have a clean string
      text = text.replace(/\s+/g, ' ');

      if ((text.includes(":") || text.includes(" - ") || text.toLowerCase().startsWith("genre")) && text.length < 200 && !text.toLowerCase().includes("http")) {
        let separator = text.includes(":") ? ":" : " - ";
        
        // Handle cases where "Genre Action, Drama" might not have a colon
        if (!text.includes(":") && !text.includes(" - ") && text.toLowerCase().startsWith("genre")) {
           text = text.replace(/genre/i, "Genre:");
           separator = ":";
        }

        const parts = text.split(separator);
        const key = parts[0].trim().replace(/[^a-zA-Z\s]/g, "");
        const value = parts.slice(1).join(separator).trim();
        
        if (key && value && key.length >= 2 && key.length < 40 && value.length < 300) {
          const genericKeys = ["download", "links", "click", "here", "watch", "online", "note", "says", "reply"];
          if (!genericKeys.some(gk => key.toLowerCase().includes(gk))) {
            // Capitalize first letter of key for consistency
            const cleanKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
            info[cleanKey] = value;
          }
        }
      }
    });

    // Fallback specifically for Genre if it wasn't found
    if (!info["Genre"] && !info["Genres"]) {
      $("div, p, li, span").each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text.toLowerCase().startsWith("genre") && text.length < 100) {
          const value = text.replace(/^genres?\s*[:\-]?\s*/i, "").trim();
          if (value && value.length > 2) {
            info["Genre"] = value;
          }
        }
      });
    }

    // 4. Download Links
    const downloadLinks: { label: string; url: string }[] = [];
    const hostname = new URL(url).hostname;
    
    const rawLinks: { label: string; url: string }[] = [];

    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || !href.startsWith("http") || href.includes(hostname)) return;

      const text = $(el).text().trim();
      const btn = $(el).find("button");
      const btnText = btn.text().trim();
      
      const combinedText = (text + " " + btnText).toLowerCase();
      // Skip non-download promotional, tutorial, or social links
      if (
        combinedText.includes("how to") || 
        combinedText.includes("telegram") || 
        combinedText.includes("join") || 
        combinedText.includes("whatsapp") ||
        combinedText.includes("trailer") ||
        combinedText.includes("ads ") ||
        combinedText.includes("bet")
      ) return;

      const isDownload = href.includes("drive") || href.includes("link") || href.includes("nexdrive") ||
                        href.includes("gdtot") || href.includes("hubcloud") || href.includes("katdrive") ||
                        href.includes("sharer") || href.includes("vcloud") || href.includes("modlinx") || 
                        href.includes("mega.nz") || href.includes("linkstaker") || href.includes("filepress") ||
                        btn.length > 0 ||
                        combinedText.includes("download") ||
                        combinedText.includes("direct") || combinedText.includes("cloud") ||
                        combinedText.includes("fast server");

      if (isDownload && !isExcludedUrl(href)) {
        let label = text || btnText || "Download Link";
        
        let quality = "";
        let size = "";
        let episode = "";
        
        const extractInfo = (textToParse: string) => {
          if (!textToParse) return;
          const qMatch = textToParse.match(/\b(480p|720p|1080p|2160p|4K|HEVC|10Bit|x264|x265|HDR)\b/i);
          const sMatch = textToParse.match(/\[\d+(?:\.\d+)?\s*(?:MB|GB)\]/i);
          const eMatch = textToParse.match(/\b(Season\s*\d+|S\d+|Episode\s*\d+|EP\s*\d+|S\d+E\d+|Pack|Batch)\b/i);
          
          if (qMatch && !quality) quality = qMatch[0].toUpperCase();
          if (sMatch && !size) size = sMatch[0].toUpperCase();
          if (eMatch && !episode) episode = eMatch[0].toUpperCase();
        };

        extractInfo(label);
        
        let current = $(el);
        for (let p = 0; p < 5; p++) {
          if (quality && size && episode) break;
          
          const parent = current.parent();
          if (parent.length) {
            const clone = parent.clone();
            clone.children().remove();
            extractInfo(clone.text().trim());
          }
          
          let prev = current.prev();
          let siblingCount = 0;
          while (prev.length && siblingCount < 10) {
            extractInfo(prev.text().trim());
            if (quality && size && episode) break;
            prev = prev.prev();
            siblingCount++;
          }
          
          current = current.parent();
          if (!current.length || current.is("body")) break;
        }

        const prefixParts = [episode, quality, size].filter(Boolean);
        const prefix = prefixParts.join(" - ");
        
        if (label.toLowerCase().includes("download") || label.length < 5 || label.toLowerCase() === "click here") {
          label = prefix ? prefix : label;
        } else {
          label = prefix ? `${prefix} - ${label}` : label;
        }

        // Clean up redundant info in label
        let cleanLabel = label.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim();
        
        // Exclude specific unwanted labels like G-Direct
        const isExcludedLabel = cleanLabel.toLowerCase().includes("g-direct");

        if (!isExcludedLabel && !rawLinks.find(l => l.url === href)) {
          rawLinks.push({ label: cleanLabel || "Download Link", url: href });
        }
      }
    });

    // Resolve protector links (like nexdrive.pro -> vcloud.zip)
    for (const link of rawLinks) {
      let finalUrl = link.url;
      
      if (finalUrl.includes("nexdrive.pro")) {
        try {
          let htmlData = "";
          try {
            const res = await fetchWithProxyRetry(finalUrl, 3);
            htmlData = res.data;
          } catch (e: any) {
            // Further fallback if all proxies fail
            try {
              const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(finalUrl);
              const proxyRes = await axios.get(proxyUrl, { timeout: 10000 });
              htmlData = proxyRes.data;
            } catch (proxyErr: any) {
              try {
                const allOriginsUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(finalUrl);
                const allOriginsRes = await axios.get(allOriginsUrl, { timeout: 10000 });
                htmlData = allOriginsRes.data.contents;
              } catch (allOriginsErr: any) {
                // Silently fail if all proxies fail, it will just not find the links
              }
            }
          }

          const $sub = cheerio.load(htmlData);
          
          // Look for vcloud.zip links in the landing page
          const vcloudLinks = $sub('a[href*="vcloud.zip"]');
          if (vcloudLinks.length > 0) {
            vcloudLinks.each((_, el) => {
              const href = $sub(el).attr("href");
              if (href) {
                let contextText = "";
                let current = $sub(el).parent();
                for (let i = 0; i < 5; i++) {
                  const prev = current.prev();
                  if (prev.length && (prev.is("h1, h2, h3, h4, h5, h6, p, div"))) {
                    contextText = prev.text().trim();
                    break;
                  }
                  current = prev;
                  if (!current.length) break;
                }
                
                let epLabel = contextText.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
                if (!epLabel || epLabel.toLowerCase().includes("vcloud")) {
                  epLabel = $sub(el).text().trim().replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
                }
                
                const combinedLabel = epLabel ? `${link.label} - ${epLabel}` : link.label;
                downloadLinks.push({ label: combinedLabel, url: href });
              }
            });
            continue; // Skip adding the original link
          } else {
            // Fallback: check scripts for vcloud URLs
            const scriptMatch = htmlData.match(/https:\/\/vcloud\.zip\/[a-zA-Z0-9]+/);
            if (scriptMatch) finalUrl = scriptMatch[0];
          }
        } catch (e: any) {
          console.error(`Failed to resolve nexdrive link: ${finalUrl}`, e.message);
        }
      }
      
      downloadLinks.push({ label: link.label, url: finalUrl });
    }

    delete info["Source"];
    return { title, cleanTitle, poster, info, downloadLinks };
  };

  // API Route for Smart Search (search websites directly)
  app.get("/api/movies/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    try {
      // Search websites directly
      const variations = new Set<string>();
      variations.add(query);
      if (!/\d$/.test(query)) {
        variations.add(query + " 2");
        variations.add(query + " 3");
      }
      const tokens = query.trim().split(/\s+/);
      if (tokens.length > 1) variations.add(tokens.slice(0, -1).join(' '));
      if (tokens.length > 2) variations.add(tokens.slice(0, -2).join(' '));

      const queries = Array.from(variations);
      const allResults: any[] = [];
      const seenUrls = new Set<string>();

      const fetchWebsiteResults = async (origin: string) => {
        try {
          const fetchPromises = queries.map(async (q) => {
            const searchApiUrl = `${origin}/search.php?q=${encodeURIComponent(q)}`;
            const searchRes = await fetchWithProxyRetry(searchApiUrl, 3);
            return searchRes.data?.hits || [];
          });
          
          const resultsNested = await Promise.allSettled(fetchPromises);
          
          for (const pRes of resultsNested) {
            if (pRes.status === 'fulfilled' && Array.isArray(pRes.value)) {
              for (const hit of pRes.value) {
                const doc = hit.document;
                let itemUrl = doc.permalink;
                if (itemUrl && !itemUrl.startsWith("http")) {
                  try { itemUrl = new URL(itemUrl, origin).href; } catch(e) {}
                }
                if (itemUrl && !seenUrls.has(itemUrl)) {
                  seenUrls.add(itemUrl);
                  allResults.push({
                    title: doc.post_title,
                    cleanTitle: doc.post_title,
                    thumbnail: doc.post_thumbnail || `https://picsum.photos/seed/${encodeURIComponent(doc.post_title)}/300/450`,
                    url: itemUrl,
                    isFromDb: false
                  });
                }
              }
            }
          }
        } catch (err: any) {
          console.error(`Website Search Error (${origin}):`, err.message);
        }
      };

      await Promise.all([
        fetchWebsiteResults('https://vegamovies.mq'),
        fetchWebsiteResults('https://rogmovies.blog')
      ]);

      res.json({
        title: `Website Search Results for "${query}"`,
        description: `Found ${allResults.length} expanded results on websites`,
        url: `Search: ${query}`,
        results: allResults,
        source: 'website'
      });

    } catch (err: any) {
      console.error("Search API Error:", err);
      res.status(500).json({ error: "Search failed", details: err.message });
    }
  });

  // API Route for Formatted Auto Scrape Search
  app.get("/api/movies/search-formatted", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    try {
      // Search websites directly
      const variations = new Set<string>();
      variations.add(query);
      if (!/\d$/.test(query)) {
        variations.add(query + " 2");
        variations.add(query + " 3");
      }
      const tokens = query.trim().split(/\s+/);
      if (tokens.length > 1) variations.add(tokens.slice(0, -1).join(' '));
      if (tokens.length > 2) variations.add(tokens.slice(0, -2).join(' '));

      const queries = Array.from(variations);
      const allResults: any[] = [];
      const seenUrls = new Set<string>();

      const fetchWebsiteResults = async (origin: string) => {
        try {
          const fetchPromises = queries.map(async (q) => {
            const searchApiUrl = `${origin}/search.php?q=${encodeURIComponent(q)}`;
            const searchRes = await fetchWithProxyRetry(searchApiUrl, 3);
            return searchRes.data?.hits || [];
          });
          
          const resultsNested = await Promise.allSettled(fetchPromises);
          
          for (const pRes of resultsNested) {
            if (pRes.status === 'fulfilled' && Array.isArray(pRes.value)) {
              for (const hit of pRes.value) {
                const doc = hit.document;
                let itemUrl = doc.permalink;
                if (itemUrl && !itemUrl.startsWith("http")) {
                  try { itemUrl = new URL(itemUrl, origin).href; } catch(e) {}
                }
                if (itemUrl && !seenUrls.has(itemUrl)) {
                  seenUrls.add(itemUrl);
                  allResults.push({
                    title: doc.post_title,
                    cleanTitle: doc.post_title,
                    thumbnail: doc.post_thumbnail || `https://picsum.photos/seed/${encodeURIComponent(doc.post_title)}/300/450`,
                    url: itemUrl,
                    baseUrl: origin
                  });
                }
              }
            }
          }
        } catch (err: any) {
          console.error(`Website Search Error (${origin}):`, err.message);
        }
      };

      await Promise.all([
        fetchWebsiteResults('https://vegamovies.mq'),
        fetchWebsiteResults('https://rogmovies.blog')
      ]);
      
      const topResults = allResults.slice(0, 10);
      
      const deepScrapedResults = await Promise.all(topResults.map(async (item) => {
        try {
          const subRes = await fetchWithProxyRetry(item.url, 2);
          const sub$ = cheerio.load(subRes.data);
          const details = await extractMovieDetails(sub$, item.url, item.baseUrl || "https://vegamovies.mq");
          
          let qualities: Record<string, any[]> = {};
          if (details.downloadLinks) {
            details.downloadLinks.forEach((link: any) => {
               let label = link.label;
               let bucket = "Other Links";
               if (label.includes("2160p") || label.includes("4K")) bucket = "4K / 2160p";
               else if (label.includes("1080p")) bucket = "1080p";
               else if (label.includes("720p")) bucket = "720p";
               else if (label.includes("480p")) bucket = "480p";
               
               if (!qualities[bucket]) qualities[bucket] = [];
               qualities[bucket].push({ label: link.label, url: link.url });
            });
          }

          return { 
            title: details.title || item.title,
            thumbnail: details.poster || item.thumbnail, 
            url: item.url,
            info: details.info,
            formattedLinks: qualities 
          };
        } catch (e) {
          return item;
        }
      }));

      res.json({
        title: `Formatted Search Results for "${query}"`,
        description: `Found ${deepScrapedResults.length} detailed results on websites`,
        url: `Search: ${query}`,
        results: deepScrapedResults,
        source: 'website-deep-formatted'
      });

    } catch (err: any) {
      console.error("Search Scrape API Error:", err);
      res.status(500).json({ error: "Search scrape failed", details: err.message });
    }
  });

  // API Route for Auto Scrape Search
  app.get("/api/movies/search-scrape", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    try {
      // Search websites directly
      const variations = new Set<string>();
      variations.add(query);
      if (!/\d$/.test(query)) {
        variations.add(query + " 2");
        variations.add(query + " 3");
      }
      const tokens = query.trim().split(/\s+/);
      if (tokens.length > 1) variations.add(tokens.slice(0, -1).join(' '));
      if (tokens.length > 2) variations.add(tokens.slice(0, -2).join(' '));

      const queries = Array.from(variations);
      const allResults: any[] = [];
      const seenUrls = new Set<string>();

      const fetchWebsiteResults = async (origin: string) => {
        try {
          const fetchPromises = queries.map(async (q) => {
            const searchApiUrl = `${origin}/search.php?q=${encodeURIComponent(q)}`;
            const searchRes = await fetchWithProxyRetry(searchApiUrl, 3);
            return searchRes.data?.hits || [];
          });
          
          const resultsNested = await Promise.allSettled(fetchPromises);
          
          for (const pRes of resultsNested) {
            if (pRes.status === 'fulfilled' && Array.isArray(pRes.value)) {
              for (const hit of pRes.value) {
                const doc = hit.document;
                let itemUrl = doc.permalink;
                if (itemUrl && !itemUrl.startsWith("http")) {
                  try { itemUrl = new URL(itemUrl, origin).href; } catch(e) {}
                }
                if (itemUrl && !seenUrls.has(itemUrl)) {
                  seenUrls.add(itemUrl);
                  allResults.push({
                    title: doc.post_title,
                    cleanTitle: doc.post_title,
                    thumbnail: doc.post_thumbnail || `https://picsum.photos/seed/${encodeURIComponent(doc.post_title)}/300/450`,
                    url: itemUrl,
                    baseUrl: origin
                  });
                }
              }
            }
          }
        } catch (err: any) {
          console.error(`Website Search Error (${origin}):`, err.message);
        }
      };

      await Promise.all([
        fetchWebsiteResults('https://vegamovies.mq'),
        fetchWebsiteResults('https://rogmovies.blog')
      ]);
      
      const topResults = allResults.slice(0, 10);
      
      const deepScrapedResults = await Promise.all(topResults.map(async (item) => {
        try {
          const subRes = await fetchWithProxyRetry(item.url, 2);
          const sub$ = cheerio.load(subRes.data);
          const details = await extractMovieDetails(sub$, item.url, item.baseUrl || "https://vegamovies.mq");
          return { ...item, ...details };
        } catch (e) {
          return item;
        }
      }));

      res.json({
        title: `Deep Search Results for "${query}"`,
        description: `Found ${deepScrapedResults.length} detailed results on websites`,
        url: `Search: ${query}`,
        results: deepScrapedResults,
        source: 'website-deep'
      });

    } catch (err: any) {
      console.error("Search Scrape API Error:", err);
      res.status(500).json({ error: "Search scrape failed", details: err.message });
    }
  });

  // API Route for Scraping
  app.post("/api/scrape", async (req, res) => {
    const { url, fullPage = false } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: "Invalid URL format. Please enter a valid URL starting with http:// or https://" });
    }

    try {
      // Special handling for vegamovies search API
      let targetUrl = url;
      if ((url.includes("vegamovies.") || url.includes("rogmovies.")) && (url.includes("/search.html") || url.includes("/search.php") || url.includes("/?s="))) {
        const urlObj = new URL(url);
        const searchQuery = urlObj.searchParams.get("q");
        if (searchQuery) {
          const variations = new Set<string>();
          variations.add(searchQuery);
          
          if (!/\d$/.test(searchQuery)) {
            variations.add(searchQuery + " 2");
            variations.add(searchQuery + " 3");
          }

          const tokens = searchQuery.trim().split(/\s+/);
          if (tokens.length > 1) {
            variations.add(tokens.slice(0, -1).join(' '));
          }
          if (tokens.length > 2) {
            variations.add(tokens.slice(0, -2).join(' '));
          }

          const queries = Array.from(variations);
          
          try {
            const fetchPromises = queries.map(async (q) => {
              const searchApiUrl = `${urlObj.origin}/search.php?q=${encodeURIComponent(q)}`;
              const searchRes = await fetchWithProxyRetry(searchApiUrl, 3);
              return searchRes.data?.hits || [];
            });
            
            const resultsNested = await Promise.allSettled(fetchPromises);
            
            const allResults: any[] = [];
            const seenUrls = new Set<string>();
            
            for (const pRes of resultsNested) {
              if (pRes.status === 'fulfilled' && Array.isArray(pRes.value)) {
                for (const hit of pRes.value) {
                  const doc = hit.document;
                  let itemUrl = doc.permalink;
                  if (itemUrl && !itemUrl.startsWith("http")) {
                    try { itemUrl = new URL(itemUrl, urlObj.origin).href; } catch(e) {}
                  }
                  
                  if (itemUrl && !seenUrls.has(itemUrl)) {
                    seenUrls.add(itemUrl);
                    allResults.push({
                      title: doc.post_title,
                      cleanTitle: doc.post_title,
                      thumbnail: doc.post_thumbnail || `https://picsum.photos/seed/${encodeURIComponent(doc.post_title)}/300/450`,
                      url: itemUrl
                    });
                  }
                }
              }
            }
            
            if (allResults.length > 0) {
              return res.json({
                title: `Combined Search Results for "${searchQuery}"`,
                description: `Found ${allResults.length} expanded results`,
                url: url,
                results: allResults
              });
            }
          } catch(err: any) {
            console.error("Vegamovies Multi-Search API error:", err.message);
          }
        }
      }

      const response = await fetchWithProxyRetry(targetUrl, 3);

      const finalUrl = response.request?.res?.responseUrl || url;
      const $ = cheerio.load(response.data);
      const baseUrl = new URL(finalUrl).origin;

      // 1. Check if this is a list page (home, category, search) or a single post
      const isSinglePost = $("body").hasClass("single") || $("body").hasClass("single-post") || $("h1.post-title").length > 0 || $("h1.entry-title").length > 0 || url.includes("-movie-download") || url.includes("/download-");
      
      const results: any[] = [];
      
      // If it's a list page, extract multiple items
      if (!isSinglePost) {
        const selectors = ["article", ".post-item", ".blog-post", ".recent-post-item", ".movie-item", ".post-card", ".type-post", ".post", "figure"];
        
        selectors.forEach(selector => {
          $(selector).each((_, el) => {
            const linkEl = $(el).find("a").first();
            const imgEl = $(el).find("img").first();
            
            let title = linkEl.text().trim() || imgEl.attr("alt") || imgEl.attr("title") || $(el).find("h2, h3, .title, .post-title").first().text().trim() || "";
            let itemUrl = linkEl.attr("href");
            
            if (itemUrl && !itemUrl.startsWith("http")) {
              try { itemUrl = new URL(itemUrl, baseUrl).href; } catch(e) {}
            }

            let thumbnail = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || 
                            imgEl.attr("data-original") || imgEl.attr("srcset")?.split(" ")[0];
            
            if (!thumbnail) {
              const style = $(el).find(".post-thumbnail, .thumb, .image").attr("style");
              if (style && style.includes("url(")) {
                const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (match) thumbnail = match[1];
              }
            }

            if (thumbnail && !thumbnail.startsWith("http") && !thumbnail.startsWith("data:")) {
              try { thumbnail = new URL(thumbnail, baseUrl).href; } catch(e) {}
            }
            
            title = title.replace(/\s+/g, ' ').trim();

            const isBaseUrl = itemUrl.replace(/\/$/, '') === baseUrl.replace(/\/$/, '');
            const isLogo = thumbnail && (thumbnail.toLowerCase().includes('logo') || thumbnail.toLowerCase().includes('banner') || thumbnail.toLowerCase().includes('favicon'));
            const isGenericTitle = title.toLowerCase().includes("download bollywood");

            if (itemUrl && itemUrl.startsWith("http") && title && title.length > 2 && !isExcludedUrl(itemUrl)) {
              if (!isBaseUrl && !isLogo && !isGenericTitle && !results.find(r => r.url === itemUrl) && itemUrl !== url) {
                results.push({
                  title,
                  cleanTitle: getCleanTitle(title),
                  thumbnail: thumbnail || `https://picsum.photos/seed/${encodeURIComponent(title)}/300/450`,
                  url: itemUrl
                });
              }
            }
          });
        });

        // Fallback if selectors didn't catch anything
        if (results.length === 0) {
          $("a:has(img)").each((_, el) => {
            let itemUrl = $(el).attr("href");
            if (!itemUrl) return;
            if (!itemUrl.startsWith("http")) {
              try { itemUrl = new URL(itemUrl, baseUrl).href; } catch(e) {}
            }
            if (!itemUrl.startsWith("http") || isExcludedUrl(itemUrl) || itemUrl === url) return;
            
            const imgEl = $(el).find("img").first();
            let title = imgEl.attr("alt") || imgEl.attr("title") || $(el).attr("title") || $(el).parent().find("h2, h3, .title").text().trim() || "";
            title = title.replace(/\s+/g, ' ').trim();
            
            let thumbnail = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || imgEl.attr("data-original");
            
            if (thumbnail && !thumbnail.startsWith("http") && !thumbnail.startsWith("data:")) {
              try { thumbnail = new URL(thumbnail, baseUrl).href; } catch(e) {}
            }

            const isBaseUrl = itemUrl.replace(/\/$/, '') === baseUrl.replace(/\/$/, '');
            const isLogo = thumbnail && (thumbnail.toLowerCase().includes('logo') || thumbnail.toLowerCase().includes('banner') || thumbnail.toLowerCase().includes('favicon'));
            const isGenericTitle = title.toLowerCase().includes("download bollywood");

            if (title && title.length > 2 && !isBaseUrl && !isLogo && !isGenericTitle) {
              if (!results.find(r => r.url === itemUrl)) {
                results.push({
                  title,
                  cleanTitle: getCleanTitle(title),
                  thumbnail: thumbnail || `https://picsum.photos/seed/${encodeURIComponent(title)}/300/450`,
                  url: itemUrl
                });
              }
            }
          });
        }

        // DEEP SCRAPE: If fullPage is true and we have results, fetch details for each
        if (fullPage && results.length > 0) {
          // Limit to first 18 results to avoid extreme latency
          const topResults = results.slice(0, 18);
          const deepResults = await Promise.all(topResults.map(async (item) => {
            try {
              const subRes = await fetchWithProxyRetry(item.url, 2);
              const sub$ = cheerio.load(subRes.data);
              const details = await extractMovieDetails(sub$, item.url, baseUrl);
              return { ...item, ...details };
            } catch (e) {
              return item; // Fallback to basic info on error
            }
          }));
          
          // Replace results with deep results
          results.splice(0, topResults.length, ...deepResults);
        }
      }

      // 2. Extract details for the main URL
      const mainDetails = await extractMovieDetails($, finalUrl, baseUrl);
      
      // 4. Pagination Extraction
      let nextPageUrl = null;
      
      // Try standard WordPress/Common pagination selectors
      let nextLink = $("a.next, a.next-page, a.page-numbers.next, a.next-btn, .pagination-next a, .next-posts-link, .nextpostslink, a[rel='next']").first();
      
      if (!nextLink.length) {
        // Fallback 1: Search for links containing exactly "Next", "Older", or "»" text to avoid matching movie titles with the word 'next'
        $("a").each((_, el) => {
          const linkText = $(el).text().trim().toLowerCase();
          const href = $(el).attr("href");
          if (href && (linkText === "next" || linkText === "next »" || linkText === "next page" || linkText === "older" || linkText === "older posts" || linkText === "»" || linkText === ">")) {
            if (!href.includes("/download-")) { // Safety check: typical movie slugs start with download-
              nextLink = $(el);
              return false; // break loop
            }
          }
        });
      }

      if (nextLink.length) {
        const nextHref = nextLink.attr("href");
        if (nextHref && nextHref.startsWith("http") && !isExcludedUrl(nextHref)) {
          nextPageUrl = nextHref;
        }
      }

      // Fallback 2: If still not found, look for numeric pagination (e.g., if we are on page 1, look for page 2)
      if (!nextPageUrl) {
        const currentUrl = url.endsWith("/") ? url : url + "/";
        const pageMatch = currentUrl.match(/\/page\/(\d+)\/?$/);
        const currentPage = pageMatch ? parseInt(pageMatch[1]) : 1;
        const nextPage = currentPage + 1;
        
        const targetPattern = pageMatch 
          ? currentUrl.replace(/\/page\/\d+\/?$/, `/page/${nextPage}/`)
          : currentUrl + `page/${nextPage}/`;

        // Check if any link on the page matches this next page pattern
        $("a").each((_, el) => {
          const href = $(el).attr("href");
          if (href && (href === targetPattern || href === targetPattern.replace(/\/$/, ""))) {
            nextPageUrl = href;
            return false;
          }
        });
      }
      
      if (nextPageUrl) {
        console.log(`Found next page: ${nextPageUrl}`);
      }

      // 3. Full Page Extraction (Metadata only)
      let fullContent = null;
      if (fullPage) {
        const allLinks: { text: string; href: string }[] = [];
        $("a").each((_, el) => {
          const href = $(el).attr("href");
          if (href && href.startsWith("http") && !isExcludedUrl(href)) {
            allLinks.push({ text: $(el).text().trim() || "No Text", href });
          }
        });

        const allImages: string[] = [];
        $("img").each((_, el) => {
          const src = $(el).attr("src") || $(el).attr("data-src");
          if (src) allImages.push(src);
        });

        const allText: string[] = [];
        $("p, h1, h2, h3, h4, h5, h6, li").each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 20) allText.push(text);
        });

        fullContent = {
          links: allLinks,
          images: [...new Set(allImages)],
          text: allText,
          html: response.data.substring(0, 50000),
        };
      }

      res.json({
        ...mainDetails,
        url: finalUrl,
        fullContent,
        nextPageUrl,
        results: results.slice(0, 40),
      });

    } catch (error: any) {
      console.error("Scraping error:", error.message);
      
      let errorMessage = "Failed to scrape the website.";
      let statusCode = 500;

      if (axios.isAxiosError(error)) {
        if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
          errorMessage = "The website could not be reached. Please check the URL or ensure the site is online.";
          statusCode = 404;
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = "The request timed out. The website might be down or loading too slowly.";
          statusCode = 408;
        } else if (error.response) {
          statusCode = error.response.status;
          if (statusCode === 404) {
            errorMessage = "The requested page was not found on the server (404).";
          } else if (statusCode === 403 || statusCode === 401) {
            errorMessage = `Access forbidden (${statusCode}). The site might be using Cloudflare or blocking automated scrapers.`;
          } else if (statusCode >= 500) {
            errorMessage = `The target website encountered a server error (${statusCode}).`;
          } else {
            errorMessage = `The website returned an error (${statusCode}).`;
          }
        } else if (error.request) {
          errorMessage = "No response received from the website. It might be blocking automated requests or your network is down.";
        }
      }

      res.status(statusCode).json({ 
        error: errorMessage, 
        details: error.message 
      });
    }
  });

  // Telegram Bot Setup
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  if (telegramBotToken) {
    const bot = new TelegramBot(telegramBotToken, { polling: true });
    console.log("Telegram bot started.");

    bot.onText(/\/start/, (msg) => {
      bot.sendMessage(msg.chat.id, "Welcome to the Movie Search Bot! 🎬\n\nSend me any movie name to search and I'll find download links for you.");
    });

    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (!text || text.startsWith('/')) return;

      const sentMsg = await bot.sendMessage(chatId, `🔍 Searching for "${text}"...\nPlease wait, this might take a few seconds.`);

      try {
        const variations = new Set<string>();
        variations.add(text);
        if (!/\d$/.test(text)) {
          variations.add(text + " 2");
          variations.add(text + " 3");
        }
        const tokens = text.trim().split(/\s+/);
        if (tokens.length > 1) variations.add(tokens.slice(0, -1).join(' '));
        if (tokens.length > 2) variations.add(tokens.slice(0, -2).join(' '));

        const queries = Array.from(variations);
        const allResults: any[] = [];
        const seenUrls = new Set<string>();

        const fetchWebsiteResults = async (origin: string) => {
          try {
            const fetchPromises = queries.map(async (q) => {
              const searchApiUrl = `${origin}/search.php?q=${encodeURIComponent(q)}`;
              const searchRes = await fetchWithProxyRetry(searchApiUrl, 3);
              return searchRes.data?.hits || [];
            });
            
            const resultsNested = await Promise.allSettled(fetchPromises);
            
            for (const pRes of resultsNested) {
              if (pRes.status === 'fulfilled' && Array.isArray(pRes.value)) {
                for (const hit of pRes.value) {
                  const doc = hit.document;
                  let itemUrl = doc.permalink;
                  if (itemUrl && !itemUrl.startsWith("http")) {
                    try { itemUrl = new URL(itemUrl, origin).href; } catch(e) {}
                  }
                  if (itemUrl && !seenUrls.has(itemUrl)) {
                    seenUrls.add(itemUrl);
                    allResults.push({
                      title: doc.post_title,
                      url: itemUrl,
                      baseUrl: origin
                    });
                  }
                }
              }
            }
          } catch (err: any) {
            console.error(`Bot Search Error (${origin}):`, err.message);
          }
        };

        await Promise.all([
          fetchWebsiteResults('https://vegamovies.mq'),
          fetchWebsiteResults('https://rogmovies.blog')
        ]);

        if (allResults.length === 0) {
          bot.editMessageText(`❌ No results found for "${text}". Try another movie name.`, {
            chat_id: chatId,
            message_id: sentMsg.message_id
          });
          return;
        }

        const topResults = allResults.slice(0, 5);
        const inlineKeyboard = topResults.map((res) => {
          const id = Math.random().toString(36).substring(2, 10);
          botSearchCache.set(id, JSON.stringify({ url: res.url, baseUrl: res.baseUrl }));
          const btnText = res.title.length > 50 ? res.title.substring(0, 47) + '...' : res.title;
          return [{ text: btnText, callback_data: `m_${id}` }];
        });

        bot.editMessageText(`✅ Found ${allResults.length} results for "${text}".\nSelect a movie from the choices below:`, {
          chat_id: chatId,
          message_id: sentMsg.message_id,
          reply_markup: {
            inline_keyboard: inlineKeyboard
          }
        });

      } catch (err: any) {
        bot.editMessageText("An error occurred while searching. Please try again later.", {
          chat_id: chatId,
          message_id: sentMsg.message_id
        });
      }
    });

    bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id;
      const messageId = query.message?.message_id;
      const data = query.data;

      if (!chatId || !messageId || !data) return;

      if (data === 'ignore') {
        bot.answerCallbackQuery(query.id).catch(() => {});
        return;
      }

      if (data.startsWith('m_')) {
        const id = data.substring(2);
        const cachedStr = botSearchCache.get(id);

        if (!cachedStr) {
          bot.answerCallbackQuery(query.id, { text: "Search session expired. Please search again.", show_alert: true });
          return;
        }

        bot.answerCallbackQuery(query.id, { text: "Fetching download links..." });
        
        try {
          const { url, baseUrl } = JSON.parse(cachedStr);
          
          bot.editMessageText("⏳ Scraping download links, please wait...", {
            chat_id: chatId,
            message_id: messageId
          });

          const response = await fetchWithProxyRetry(url, 3);
          const finalUrl = response.request?.res?.responseUrl || url;
          const $ = cheerio.load(response.data);
          
          const details = await extractMovieDetails($, finalUrl, baseUrl);

          if (!details.downloadLinks || details.downloadLinks.length === 0) {
            bot.editMessageText(`❌ No download links found for ${details.title}.`, {
              chat_id: chatId,
              message_id: messageId
            });
            return;
          }

          const qualities: Record<string, any[]> = {};
          details.downloadLinks.forEach((link: any) => {
             let label = link.label;
             let bucket = "Other Links";
             if (label.includes("2160p") || label.includes("4K")) bucket = "4K / 2160p";
             else if (label.includes("1080p")) bucket = "1080p";
             else if (label.includes("720p")) bucket = "720p";
             else if (label.includes("480p")) bucket = "480p";
             
             if (!qualities[bucket]) qualities[bucket] = [];
             
             const safeLabel = label.length > 50 ? label.substring(0, 47) + '...' : label;
             qualities[bucket].push({ text: safeLabel, url: link.url });
          });

          let messageText = `🎬 *${details.title}*\n\n`;
          if (details.info.Genre) {
             messageText += `*Genres:* ${details.info.Genre}\n`;
          }
          if (details.info.Language) {
             messageText += `*Language:* ${details.info.Language}\n`;
          }

          const inlineKeyboard: any[][] = [];

          Object.keys(qualities).sort().forEach(bucket => {
            inlineKeyboard.push([{ text: `--- ${bucket} ---`, callback_data: 'ignore' }]);
            qualities[bucket].slice(0, 10).forEach(btn => {
              inlineKeyboard.push([{ text: btn.text, url: btn.url }]);
            });
          });

          try {
            await bot.deleteMessage(chatId, messageId);
          } catch (e) {}

          if (details.poster) {
             try {
                await bot.sendPhoto(chatId, details.poster, {
                  caption: messageText,
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: inlineKeyboard
                  }
                });
             } catch (photoErr) {
                await bot.sendMessage(chatId, messageText, {
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: inlineKeyboard
                  }
                });
             }
          } else {
             await bot.sendMessage(chatId, messageText, {
               parse_mode: 'Markdown',
               reply_markup: {
                 inline_keyboard: inlineKeyboard
               }
             });
          }

        } catch (err: any) {
          console.error("Bot Extract Error:", err.message);
          bot.editMessageText("An error occurred while fetching download links.", {
            chat_id: chatId,
            message_id: messageId
          });
        }
      }
    });
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
