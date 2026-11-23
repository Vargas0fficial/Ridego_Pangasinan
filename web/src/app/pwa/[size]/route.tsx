import { ImageResponse } from 'next/og';
import { PwaIconArt } from '@/components/pwaIcon';

const SIZES = [192, 512];

/** /pwa/192 and /pwa/512 are the install icons. Add ?m=1 for the maskable version (mark kept inside the safe zone). */
export async function GET(req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size: raw } = await ctx.params;
  const size = Number(raw);
  if (!SIZES.includes(size)) return new Response('Not found', { status: 404 });
  const maskable = new URL(req.url).searchParams.get('m') === '1';
  return new ImageResponse(<PwaIconArt size={size} rounded={!maskable} inset={maskable ? 0.72 : 1} />, {
    width: size,
    height: size,
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}