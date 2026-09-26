import Link from 'next/link';
import Image from 'next/image';

export default function MidiaHostNotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F9FF] px-5 text-center text-slate-950">
      <div className="max-w-md">
        <Image src="/brands/midia/logo.png" alt="Midia.Pro" width={180} height={180} className="mx-auto h-24 w-auto object-contain" />
        <h1 className="mt-6 text-2xl font-black">Página indisponível</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Este endereço ainda não possui essa função publicada na Midia.Pro.
        </p>
        <Link href="https://midia.pro" className="mt-6 inline-flex rounded-xl bg-[#003295] px-5 py-3 text-sm font-black text-white">
          Conhecer a Midia.Pro
        </Link>
      </div>
    </main>
  );
}
