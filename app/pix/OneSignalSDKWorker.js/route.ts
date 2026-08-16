// O navegador requisita /OneSignalSDKWorker.js no host pix.wiki.
// O middleware existente reescreve a URL para /pix/OneSignalSDKWorker.js,
// então esta Route Handler entrega o worker mantendo escopo raiz no browser.
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(
    'importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");\n',
    {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
