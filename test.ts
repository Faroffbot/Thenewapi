import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  let finalUrl = 'https://nexdrive.pro/genxfm784776403332/';
  try {
    let htmlData = "";
    try {
      const res = await axios.get(finalUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        timeout: 5000
      });
      htmlData = res.data;
    } catch (e: any) {
      console.log(`Direct fetch failed for ${finalUrl}, trying codetabs proxy...`);
      try {
        // Intentionally break codetabs to test allorigins
        const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent('https://invalid-url-to-break.com');
        const proxyRes = await axios.get(proxyUrl, { timeout: 10000 });
        htmlData = proxyRes.data;
      } catch (proxyErr: any) {
        console.log(`Codetabs proxy failed for ${finalUrl}, trying allorigins proxy...`);
        const allOriginsUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(finalUrl);
        const allOriginsRes = await axios.get(allOriginsUrl, { timeout: 10000 });
        htmlData = allOriginsRes.data.contents || "";
      }
    }

    const $sub = cheerio.load(htmlData);
    
    const vcloudLinks = $sub('a[href*="vcloud.zip"]');
    console.log("Found vcloud links:", vcloudLinks.length);
    vcloudLinks.each((_, el) => {
      console.log($sub(el).attr("href"));
    });
  } catch (e: any) {
    console.error(`Failed to resolve nexdrive link: ${finalUrl}`, e.message);
  }
}

test();
