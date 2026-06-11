export async function onRequestGet() {
  return new Response(JSON.stringify({ message: 'Test function works!' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
