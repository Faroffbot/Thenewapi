# VegaScraper API Documentation

Welcome to the VegaScraper API. This API allows other websites and applications to programmatically scrape and search for movie data, including titles, posters, and download links, from supported movie websites.

## Base URL

All API requests should be made to your deployed application's URL. For example:
`https://YOUR_APP_URL/`

## Endpoints

### 1. Smart Search
Dynamically scrape and search multiple websites directly for a query.

- **URL:** `/api/movies/search`
- **Method:** `GET`
- **Query Parameters:**
  - `q` (required): The search query (e.g., "Batman")
- **Example:** `/api/movies/search?q=Batman`

### 2. Scrape Specific URL
Scrape a specific movie or show URL to extract its details and download links.

- **URL:** `/api/scrape`
- **Method:** `POST`
- **Body Parameters (JSON):**
  - `url` (required): The URL of the movie or show page to scrape.
- **Example Body:** `{"url": "https://vegamovies.market/movie-url"}`

## Data Structure

### Search Response Example
```json
{
  "title": "Website Search Results for \"Batman\"",
  "description": "Found 5 expanded results on websites",
  "url": "Search: Batman",
  "results": [
    {
      "title": "Batman Begins (2005)",
      "cleanTitle": "Batman Begins (2005)",
      "thumbnail": "https://example.com/poster.jpg",
      "url": "https://vegamovies.market/batman-begins/",
      "isFromDb": false
    }
  ],
  "source": "website"
}
```

### Scrape Response Example
```json
{
  "title": "Batman Begins",
  "cleanTitle": "Batman",
  "poster": "https://example.com/poster.jpg",
  "info": {
    "Genre": "Action, Crime",
    "Language": "English"
  },
  "downloadLinks": [
    {
      "label": "Download 720p",
      "url": "https://download-link.com"
    }
  ]
}
```

## Integration Example (JavaScript)

```javascript
async function searchMovies() {
  try {
    const response = await fetch('https://YOUR_APP_URL/api/movies/search?q=Batman');
    const result = await response.json();

    if (result.results) {
      result.results.forEach(movie => {
        console.log('Title:', movie.title);
        console.log('Thumbnail:', movie.thumbnail);
        console.log('URL:', movie.url);
      });
    }
  } catch (error) {
    console.error('Error searching movies:', error);
  }
}

searchMovies();
```

## Usage Tips

1. **Referrer Policy**: When displaying images (posters/thumbnails) from the API, ensure your `<img>` tags include `referrerPolicy="no-referrer"` to avoid broken images due to hotlinking protections.
2. **Rate Limiting**: Please be mindful of the number of requests you make to ensure stability for all users. The API performs live web scraping, which can take time and resources.

---
Built with VegaScraper Intelligence.
