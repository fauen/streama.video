# streama.video

Website to check which streaming providers has a certain movie/show in a specific country.

## Features

- Search for movies and TV shows by name
- View which streaming services have the title available
- Filter by country (Sweden, United Kingdom, United States)
- See service type (Subscription, Purchase, Free, TV Channel) with color-coded badges

## How It Works

This is a **static website** hosted on **Cloudflare Pages** with **Cloudflare Pages Functions** acting as a secure API proxy:

1. **Frontend**: Static HTML/CSS/JS served directly to users
2. **API Proxy**: Pages Functions forward requests to [Watchmode API](https://api.watchmode.com/)
3. **Security**: Your Watchmode API key is stored as a **Cloudflare environment variable** (never exposed in browser code)

```
User → Cloudflare Pages (static) 
      → Pages Functions (proxy) 
      → Watchmode API (with API key)
      → Response → User
```

## Setup

### Prerequisites

- A **Cloudflare account**
- A **Watchmode API key** (get it from [Watchmode](https://www.watchmode.com/))
- A **GitHub repository** connected to Cloudflare Pages

### 1. Configure Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Create a new project connected to your GitHub repository
3. Set the **project name** to `streama-video` (or your preferred name)
4. **Environment Variables** (Required):
   - Go to your Pages project → Settings → Environment Variables
   - Add a **secret** variable named `WATCHMODE_API_KEY` 
   - Set the value to your Watchmode API key
   - (Optional) You can also use `API_KEY` as the variable name - the code checks both

### 2. Deploy

- Push your code to the `main` branch
- Cloudflare Pages will **automatically detect** the `functions/` directory
- Build and deployment happens automatically (usually within 1-2 minutes)
- Your site will be available at `https://YOUR-PROJECT.pages.dev`

## Project Structure

```
.
├── index.html          # Main search page
├── functions/          # Cloudflare Pages Functions
│   └── api/
│       └── proxy/
│           └── v1/
│               ├── search.js           # /api/proxy/v1/search
│               └── title/
│                   └── [id]/sources.js # /api/proxy/v1/title/{id}/sources
└── README.md           # This file
```

## Customization

### Adding More Countries

Edit the `<select id="countrySelect">` element in `index.html`:

```html
<select id="countrySelect">
  <option value="">Select Country</option>
  <option value="SE">Sweden</option>
  <option value="GB">United Kingdom</option>
  <option value="US">United States</option>
  <!-- Add more countries here -->
  <option value="CA">Canada</option>
  <option value="DE">Germany</option>
</select>
```

Use [ISO 3166-1 alpha-2 country codes](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2).

### Changing API Endpoints

If you need to call additional Watchmode API endpoints:

1. Create a new function file in `functions/api/proxy/v1/` matching the URL structure
2. Follow the same pattern as existing functions
3. See `DEVELOPMENT.md` for detailed instructions

## API Reference

### Search

**Endpoint**: `GET /api/proxy/v1/search`

**Query Parameters**:
- `search_field`: What to search (typically `name`)
- `search_value`: The search query

**Example**:
```
GET /api/proxy/v1/search?search_field=name&search_value=Inception
```

### Sources

**Endpoint**: `GET /api/proxy/v1/title/{id}/sources`

**Query Parameters**:
- `regions`: Country code (e.g., `US`, `GB`, `SE`)

**Example**:
```
GET /api/proxy/v1/title/27205/sources?regions=US
```

## Troubleshooting

### API calls return HTML or 404
- Check that Pages Functions are enabled for your project
- Verify the function file paths match your API routes
- Check build logs in Cloudflare dashboard for errors

### "API_KEY not configured" error
- Ensure `WATCHMODE_API_KEY` is set in Cloudflare Pages project settings
- The variable must be added as a **secret** environment variable
- Wait for redeployment after adding the variable

### Build fails with "Invalid Pages function route"
- Parameter names in function files can only contain alphanumeric and underscore characters
- ❌ Invalid: `[...path].js`, `[param.name].js`
- ✅ Valid: `[path].js`, `[id].js`, `[slug].js`

## License

MIT License - see LICENSE file for details.
