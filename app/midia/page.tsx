import { headers } from 'next/headers';
import MidiaLandingV2 from '@/components/midia/MidiaLandingV2';
import './landing-v2.css';

export const dynamic = 'force-dynamic';

export default async function MidiaLandingPage() {
  const headerList = await headers();
  const host = (headerList.get('host') || '').split(':')[0].toLowerCase();
  const productHost = host === 'midia.pro' || host === 'www.midia.pro';
  const loginHref = productHost ? '/login' : '/midia/login';
  const signupHref = `${loginHref}?mode=signup`;

  return <MidiaLandingV2 loginHref={loginHref} signupHref={signupHref} />;
}
