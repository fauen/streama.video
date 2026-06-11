/**
 * Cloudflare Pages Function - API Proxy
 * Handles /api/proxy/v1/* requests and proxies to Watchmode v1 API
 */
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  // context.params.path contains the path after /api/proxy/v1/
  // For /api/proxy/v1/search, context.params.path = "search"
  // For /api/proxy/v1/title/123/sources, context.params.path = "title/123/sources" (if it captures all)
  // We need to prepend /v1/ to form the full Watchmode API path
  const fullPath = `/v1/${context.params.path}${url.search}`;
  const apiUrl = `https://api.watchmode.com${fullPath}`;

  try {
    // Get API key from environment
    const apiKey = context.env.API_KEY || context.env.WATCHMODE_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'API_KEY environment variable not configured'
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
