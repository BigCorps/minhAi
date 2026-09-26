import type { Metadata } from 'next';
import MidiaPlayer from '@/components/midia/MidiaPlayer';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: 'Player | Midia.Pro',
  robots: { index: false, follow: false },
};

export default async function MidiaPlayerPage({ params }: Props) {
  const { slug } = await params;
  return <MidiaPlayer publisherSlug={slug.toLowerCase()} />;
}
