# AI Agent Instructions - streama.video

This document provides guidance for AI agents (Mistral Vibe and peers) working on this Cloudflare Pages project.

## Project Type

This is a **static site with Cloudflare Pages Functions** (not a Cloudflare Worker). Key distinction:
- Functions are file-based and auto-detected from `functions/` directory
- No `wrangler.toml` configuration file
- Environment variables accessed via `context.env.VAR_NAME`

## Repository Structure

```
.
├── index.html              # Frontend - search UI
├── test.html              # Test page (if present)
├── functions/             # Cloudflare Pages Functions
│   └── api/
│       └── proxy/
│           └── v1/
│               ├── search.js              # Handles /api/proxy/v1/search
│               └── title/
│                   └── [id]/
│                       └── sources.js    # Handles /api/proxy/v1/title/{id}/sources
├── README.md              # User-facing documentation
├── CONTRIBUTING.md        # Developer/maintainer documentation
├── LICENSE
└── AGENTS.md              # This file
```

## Function Routing Rules

**CRITICAL**: Cloudflare Pages Functions have strict parameter naming rules:
- Parameter names must contain **only alphanumeric characters and underscores**
- ❌ **INVALID**: `[...path]`, `[param.name]`, `[param-name]`
- ✅ **VALID**: `[path]`, `[id]`, `[slug]`, `[title_id]`

Each URL path segment must have a corresponding directory and file:
- `/api/proxy/v1/search` → `functions/api/proxy/v1/search.js`
- `/api/proxy/v1/title/{id}/sources` → `functions/api/proxy/v1/title/[id]/sources.js`

## Required Function Structure

Every API function must export two handlers:

```javascript
export async function onRequestGet(context) {
  // Main handler for GET requests
  // Access env vars: context.env.WATCHMODE_API_KEY
  // Return: new Response(body, { status, headers })
}

export async function onRequestOptions() {
  // CORS preflight handler - REQUIRED
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

## Environment Variables

Required in Cloudflare Pages:
- `WATCHMODE_API_KEY` - Primary API key (also checks `API_KEY` as fallback)

Access pattern:
```javascript
const apiKey = context.env.WATCHMODE_API_KEY || context.env.API_KEY;
```

Always check for presence and return meaningful error if missing:
```javascript
if (!apiKey) {
  return new Response(JSON.stringify({ error: 'API_KEY not configured' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
```

## API Proxy Pattern

All functions act as proxies to `https://api.watchmode.com`:

```javascript
const apiUrl = `https://api.watchmode.com${url.pathname.replace('/api/proxy', '')}${url.search}`;

const response = await fetch(apiUrl, {
  headers: { 'X-API-Key': apiKey }
});

let body = await response.text();

// Ensure valid JSON
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
```

## Data Processing Standards

### Type Normalization

The Watchmode API returns inconsistent type names. Normalize in source processing:
- `purchase` → `buy`

### Deduplication

Watchmode often returns multiple entries for the same service with different formats (SD, HD, 4K). Deduplicate by `name + type`:

```javascript
const seen = new Set();
return data.filter(source => {
    const key = `${source.name.toLowerCase()}-${source.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
});
```

## Service Types

Standardized service types and their display colors:

| Type | Color | Normalized From |
|------|-------|-----------------|
| sub | Green | subscription |
| rent | Yellow | rental |
| buy | Red | purchase, buy |
| free | Blue | free |
| tve | Purple | tv, tv_channel |

## File Editing Constraints

### Always Preserve
- CORS headers in all responses
- `onRequestOptions` export in every function
- JSON response format with proper Content-Type
- API key secrecy (never expose in frontend code)

### Style Guidelines
- Use single quotes for strings
- Use 2 spaces for indentation
- Keep functions focused on single responsibilities
- Add inline comments for non-obvious logic

## Testing Approach

Test functions using `curl`:

```bash
# Search
curl -X GET "https://YOUR-SITE.pages.dev/api/proxy/v1/search?search_field=name&search_value=test" \
  -H "Accept: application/json"

# Sources
curl -X GET "https://YOUR-SITE.pages.dev/api/proxy/v1/title/1374504/sources?regions=US" \
  -H "Accept: application/json"
```

## Common Pitfalls

1. **Invalid parameter names** - Use only `[param]`, not `[...param]` or `[param.name]`
2. **Missing CORS headers** - Always include `Access-Control-Allow-Origin: *`
3. **Non-JSON responses** - Watchmode may return HTML errors; validate and wrap
4. **File path mismatch** - Function path must exactly match URL path structure
5. **Environment variable timing** - New variables require redeployment

## Workflow for Adding New Endpoints

1. Identify the URL pattern (e.g., `/api/proxy/v1/movies/popular`)
2. Create matching file structure in `functions/`
3. Implement proxy following the template in `CONTRIBUTING.md`
4. Test with curl before pushing
5. Push to main branch - Cloudflare Pages auto-deploys

## Git Practices

**Workflow**: Always work in feature branches, not directly on main.
- Before starting work, **ask** the user: "What branch should I create for this?"
- Create branch: `git checkout -b feature/your-feature`
- Push freely to feature branches (no confirmation needed)
- Merge to main when complete: `git checkout main && git merge feature/your-feature`

- Prefer atomic commits with clear messages
- Reference issue numbers if applicable
- Include both added and modified files in single commit for a feature
- Use `git status` to verify changes before commit

## Tool Permissions

You do **not** need to approve each tool call. I am authorized to run:
- `bash` - for shell commands (ls, cd, pwd, etc.)
- `grep` - for code searching
- `read` - for reading files
- `edit` - for modifying files
- `git` - for git operations (status, diff, log)
- All other standard tools

**No permission prompts needed** for read-only exploration or standard development operations.
