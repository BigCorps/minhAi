import { NextResponse, type NextRequest } from 'next/server';
import {
  CONVITEIA_PARTNER_COOKIE,
  CONVITEIA_PARTNER_COOKIE_MAX_AGE,
  parceiroConviteiaPorSlug,
} from '@/lib/conviteria/parceiros-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await context.params;
  const slug = String(rawSlug || '').trim().toLowerCase();
  const partner = await parceiroConviteiaPorSlug(slug);
  const target = new URL('/', req.url);
  if (partner) target.searchParams.set('parceiro', partner.slug);
  const response = NextResponse.redirect(target, 307);
  response.headers.set('Cache-Control', 'no-store');
  if (partner) {
    response.cookies.set(CONVITEIA_PARTNER_COOKIE, partner.code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CONVITEIA_PARTNER_COOKIE_MAX_AGE,
    });
  }
  return response;
}
