export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(
    'User-agent: *\nDisallow: /\n',
    {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
