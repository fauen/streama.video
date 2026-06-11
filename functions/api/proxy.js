/**
 * Cloudflare Pages Function - API Proxy
 * Ensures all responses are valid JSON
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Get the path after /api/proxy
  const path = url.pathname.replace('/api/proxy', '') + url.search;
  const apiUrl = `https://api.watchmode.com${path}`;

  try {
    // Get API key from environment - try common names
    const apiKey = context.env.API_KEY || context.env.WATCHMODE_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'API_KEY environment variable not configured',
        available_vars: Object.keys(context.env)
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
