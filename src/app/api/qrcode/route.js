import { renderQrSvg } from '@/lib/qrcode';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url') || request.nextUrl.origin;
    const size = parseInt(searchParams.get('size') || '300', 10);
    const darkColor = searchParams.get('dark') || '#0f172a';
    const lightColor = searchParams.get('light') || '#ffffff';

    const svg = renderQrSvg(targetUrl, {
      size,
      margin: 2,
      darkColor,
      lightColor,
      title: 'Gym Workout Routine QR Code',
    });

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    return new Response(`<svg><text>Error generating QR: ${error.message}</text></svg>`, {
      status: 500,
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }
}
