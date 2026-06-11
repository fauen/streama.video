# Development Documentation - Stream Search

## Project Overview

This project is a **Cloudflare Pages** static site with **Pages Functions** that proxies API requests to Watchmode. The site allows users to search for movies and TV shows and see which streaming services they're available on in their selected country.

## Architecture

```
├── index.html          # Frontend - Search UI
├── functions/          # Cloudflare Pages Functions
│   └── api/            # API proxy functions
│       └── proxy/      # Proxy route
│           └── v1/     # v1 API endpoints
│               ├── search.js           # Handles /api/proxy/v1/search
│               └── title/
│                   └── [id]/sources.js # Handles /api/proxy/v1/title/{id}/sources
└── README.md           # User-facing documentation
```

## How It Works

### Frontend
- Static HTML/CSS/JS that runs in the browser
- Makes API calls to `/api/proxy/v1/...` endpoints
- Displays search results with streaming availability

### Backend (Pages Functions)
- **No server required** - Functions run on Cloudflare's edge network
- Acts as a proxy to Watchmode API (`api.watchmode.com`)
- Adds the `X-API-Key` header using the `WATCHMODE_API_KEY` environment variable
- This keeps the API key secret (not exposed in frontend code)

### Routing
The frontend calls two main endpoints:

1. **Search**: `GET /api/proxy/v1/search?search_field=name&search_value={query}`
   - Function: `functions/api/proxy/v1/search.js`
   - Forwards to: `https://api.watchmode.com/v1/search?search_field=name&search_value={query}`

2. **Sources**: `GET /api/proxy/v1/title/{id}/sources?regions={country}`
   - Function: `functions/api/proxy/v1/title/[id]/sources.js`
   - Forwards to: `https://api.watchmode.com/v1/title/{id}/sources?regions={country}`

### Important: Cloudflare Pages Functions Routing Rules

**⚠️ KEY GOTCHA:** Cloudflare Pages Functions parameter names must only contain alphanumeric and underscore characters. **`[...path]` is INVALID** (the dots are not allowed).

- `[param]` matches **ONE** path segment only
- `[param1]/[param2]` matches two segments
- There's NO built-in catch-all syntax for multi-segment paths

This is why we have separate files for each endpoint structure rather than a single catch-all function.

## Environment Variables

Required in Cloudflare Pages dashboard settings:
- `WATCHMODE_API_KEY` - Your Watchmode API key (also tries `API_KEY` as fallback)

These are **automatically available** to Pages Functions via `context.env.WATCHMODE_API_KEY`.

## Adding New API Endpoints

If you need to add a new Watchmode API endpoint:

1. **Identify the URL pattern** the frontend will call (e.g., `/api/proxy/v1/movies/popular`)
2. **Create a matching function file**:
   - For `/api/proxy/v1/movies/popular` → `functions/api/proxy/v1/movies/popular.js`
   - For `/api/proxy/v1/movies/{id}` → `functions/api/proxy/v1/movies/[id].js`
   - For `/api/proxy/v1/movies/{id}/details` → `functions/api/proxy/v1/movies/[id]/details.js`

3. **Function template**:
```javascript
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Build the Watchmode API URL
  const apiUrl = `https://api.watchmode.com${url.pathname.replace('/api/proxy', '')}${url.search}`;
  
  // Get API key
  const apiKey = context.env.API_KEY || context.env.WATCHMODE_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
  
  // Forward to Watchmode
  const response = await fetch(apiUrl, {
    headers: { 'X-API-Key': apiKey }
  });
  
  let body = await response.text();
  
  // Ensure valid JSON response
  if (!body.trim()) {
    body = JSON.stringify({ error: 'Empty response' });
  } else if (!body.startsWith('{') && !body.startsWith('[')) {
    body = JSON.stringify({ error: 'Non-JSON response', status: response.status });
  }
  
  return new Response(body, {
    status: response.status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
```

## Testing

Test endpoints directly using curl:

```bash
# Search
curl -X GET "https://YOUR-SITE.pages.dev/api/proxy/v1/search?search_field=name&search_value=test" -H "Accept: application/json"

# Sources
curl -X GET "https://YOUR-SITE.pages.dev/api/proxy/v1/title/1374504/sources?regions=US" -H "Accept: application/json"
```

## Deployment

1. Push changes to the `main` branch
2. Cloudflare Pages **automatically detects** changes in the `functions/` directory
3. Builds and deploys automatically (no manual trigger needed)
4. Check build logs in Cloudflare dashboard if issues arise

## Common Issues & Fixes

### Issue: Build fails with "Invalid Pages function route"
**Cause**: Parameter name contains invalid characters (e.g., `[...path]` has dots)
**Fix**: Use only alphanumeric + underscore in parameter names: `[path]`, `[id]`, `[slug]`, etc.

### Issue: API returns HTML instead of JSON
**Cause**: Function file path doesn't match the requested URL
**Fix**: Create the function file at the correct path to match the URL structure

### Issue: "API_KEY not configured" error
**Cause**: Environment variable not set in Cloudflare Pages settings
**Fix**: Add `WATCHMODE_API_KEY` (or `API_KEY`) in Cloudflare dashboard → Pages → Project Settings → Environment Variables

### Issue: CORS errors
**Cause**: Missing `onRequestOptions` handler or incorrect CORS headers
**Fix**: Ensure every function exports `onRequestOptions` with proper CORS headers

## Cloudflare Pages Functions vs Workers

- **Pages Functions**: File-based routing, simpler, built into Pages
- **Workers**: More powerful, full routing control, separate product

This project uses **Pages Functions** (not Workers), which means:
- No `wrangler.toml` needed
- Functions auto-detected from `functions/` directory
- Environment variables from dashboard are in `context.env`
- No separate Workers deployment needed
