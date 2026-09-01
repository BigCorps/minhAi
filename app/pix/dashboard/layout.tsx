import PixWikiDashboardNav from '@/components/pix/PixWikiDashboardNav';

export default function PixWikiDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PixWikiDashboardNav />
    </>
  );
}
