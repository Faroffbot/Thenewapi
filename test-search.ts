import axios from "axios";
import * as cheerio from "cheerio";

async function test() {
  try {
    const res = await axios.get("https://vegamovies.mq/search.php?q=Citadel", {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    console.log(JSON.stringify(res.data.hits[0].document, null, 2));
  } catch(e: any) {
    console.error(e.message);
  }
}
test();
