/**
 * Cloudflare Pages Function - API Proxy for search
 * Handles /api/proxy/v1/search requests and proxies to Watchmode
 */
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Forward to Watchmode search endpoint
  const apiUrl = `https://api.watchmode.com/v1/search${url.search}`;

  try {
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
    
    const response = await fetch(apiUrl, {
      headers: {
        'X-API-Key': apiKey
      }
    });

    let body = await response.text();

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
