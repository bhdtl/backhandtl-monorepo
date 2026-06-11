export const config = {
  runtime: 'edge',
};

export default function handler(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  
  return new Response(
    JSON.stringify({ country }), 
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
