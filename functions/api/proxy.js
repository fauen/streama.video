/**
 * Cloudflare Pages Function - API Proxy
 * Proxies requests to Watchmode API with API key from environment variables
 */
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Get the path after /api/proxy
  const path = url.pathname.replace('/api/proxy', '') + url.search;
  const apiUrl = `https://api.watchmode.com${path}`;

  try {
    // Get API key from environment - try common names
    const apiKey = context.env.API_KEY || context.env.WATCHMODE_API_KEY;
    
    // Debug: log all env vars (first 10 chars of each value)
    const envDebug = {};
    for (const [key, value] of Object.entries(context.env)) {
      envDebug[key] = value ? `${value.substring(0, 10)}...` : '(empty)';
    }
    
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'API_KEY environment variable not configured in Cloudflare Pages settings',
        env_debug: envDebug,
        apiKey_check: {
          API_KEY: context.env.API_KEY ? 'SET' : 'NOT SET',
          WATCHMODE_API_KEY: context.env.WATCHMODE_API_KEY ? 'SET' : 'NOT SET'
        },
        path_info: {
          path: path,
          url: request.url
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Forward to Watchmode with API key
    const response = await fetch(apiUrl, {
      headers: {
        'X-API-Key': apiKey
      }
    });

    let body = await response.text();

    // If response isn't JSON, wrap it
    if (!body.trim()) {
      body = JSON.stringify({ error: 'Empty response from API' });
    } else if (!body.startsWith('{') && !body.startsWith('[')) {
      body = JSON.stringify({ 
        error: 'Non-JSON response from API', 
        status: response.status,
        body: body.substring(0, 200) 
      });
    }

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
}

// Handle OPTIONS for CORS preflight
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
