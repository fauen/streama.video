/**
 * Cloudflare Pages Function - API Proxy for /api/proxy/v1/*
 * Handles all requests under /api/proxy/v1/ and proxies to Watchmode v1 API
 */
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Get the path after /api/proxy/v1
  // For /api/proxy/v1/search?..., the full pathname is /api/proxy/v1/search
  // We need to extract /v1/search from it
  const pathAfterProxy = url.pathname.replace('/api/proxy', '');
  const apiUrl = `https://api.watchmode.com${pathAfterProxy}`;

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
