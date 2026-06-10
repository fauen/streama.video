/**
 * Cloudflare Pages Function - API Proxy
 * 
 * This function proxies requests to the Watchmode API while keeping
 * the API key secure in encrypted environment variables.
 * 
 * All requests to /api/proxy/* are forwarded to api.watchmode.com
 * with the WATCHMODE_API_KEY header added.
 */

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Get the path after /api/proxy
  const path = url.pathname.replace('/api/proxy', '') + url.search;
  
  // Build the Watchmode API URL
  const apiUrl = `https://api.watchmode.com${path}`;
  
  try {
    // Forward to Watchmode with API key from encrypted environment variable
    const response = await fetch(apiUrl, {
      headers: {
        'X-API-Key': context.env.WATCHMODE_API_KEY
      }
    });
    
    // Return with CORS headers for browser requests
    return new Response(await response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: 'Proxy request failed' }), {
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
