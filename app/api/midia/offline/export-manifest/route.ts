import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia, adminMidiaStorage } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';

function addDays(iso: string, amount: number) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function zonedDateTimeToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second = 0] = time.split(':').map(Number);
  let guess = Date.UTC(year, month - 1, day, hour, minute, second);

  // Duas passagens cobrem mudanças de offset/DST sem dependência externa.
  for (let i = 0; i < 2; i += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(guess));
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour), Number(map.minute), Number(map.second));
    guess -= asUtc - Date.UTC(year, month - 1, day, hour, minute, second);
  }
  return new Date(guess);
}

function extFor(fileName: string, mimeType: string) {
  const match = String(fileName || '').match(/\.([a-zA-Z0-9]{2,5})$/);
  if (match) return match[1].toLowerCase();
  if (mimeType === 'video/mp4') return 'mp4';
  if (mimeType === 'video/webm') return 'webm';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'midia';
}

function buildPlayerHtml(playlist: any) {
  const embedded = JSON.stringify(playlist).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>Midia.Pro Offline - ${playlist.screen.name}</title>
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000;color:#fff;font-family:Arial,sans-serif}#stage{position:fixed;inset:0;background:#000}#stage img,#stage video{width:100%;height:100%;object-fit:contain;background:#000;opacity:0;transition:opacity .42s ease}#stage .show{opacity:1}.badge{position:fixed;left:18px;top:18px;z-index:5;background:rgba(0,0,0,.62);backdrop-filter:blur(10px);border-radius:999px;padding:9px 12px;font-size:11px;font-weight:800;letter-spacing:.04em}.warn{color:#ffcf4a}.clock{position:fixed;right:18px;top:18px;z-index:5;background:rgba(0,0,0,.62);border-radius:999px;padding:9px 12px;font-size:11px;font-weight:800}.empty{display:grid;place-items:center;width:100%;height:100%;text-align:center;color:#94a3b8;padding:30px;box-sizing:border-box}</style>
</head>
<body>
<div id="stage"></div>
<div class="badge"><span class="warn">MODO OFFLINE</span> · SEM REALTIME · SEM CONFIRMAÇÃO AUTOMÁTICA</div>
<div class="clock" id="clock"></div>
<script>
const DATA=${embedded};
const stage=document.getElementById('stage'); const clock=document.getElementById('clock');
let ownIndex=0, partnerIndex=0, ownSincePartner=0, current=null, timer=null; const played=new Set();
const partnerEvery=DATA.screen.networkInventoryPercent>0?Math.max(2,Math.round(100/DATA.screen.networkInventoryPercent)):Infinity;
function tick(){clock.textContent=new Date().toLocaleString('pt-BR');} tick(); setInterval(tick,1000);
function dueScheduled(){const now=Date.now(); return DATA.scheduled.find(x=>!played.has(x.id)&&new Date(x.plannedAt).getTime()<=now&&new Date(x.windowEndAt).getTime()>now);}
function next(){const paid=dueScheduled(); if(paid){played.add(paid.id); ownSincePartner=0; return paid;} const partner=DATA.partner||[]; const own=DATA.own||[]; if(partner.length&&(own.length===0||ownSincePartner>=partnerEvery-1)){const x=partner[partnerIndex++%partner.length];ownSincePartner=0;return x;} if(own.length){ownSincePartner++;return own[ownIndex++%own.length];} if(partner.length)return partner[partnerIndex++%partner.length]; return null;}
function clearCurrent(done){if(timer)clearTimeout(timer);timer=null; if(!current){done();return;} current.classList.remove('show');setTimeout(()=>{if(current?.tagName==='VIDEO'){try{current.pause()}catch{}}stage.innerHTML='';current=null;done();},220);}
function play(){const item=next(); if(!item){stage.innerHTML='<div class="empty"><div><h2>Tela pronta</h2><p>Nenhuma mídia disponível neste pacote.</p></div></div>';setTimeout(play,5000);return;} clearCurrent(()=>{const el=document.createElement(item.kind==='video'?'video':'img');current=el;el.src='./media/'+item.localFile;if(item.kind==='video'){el.autoplay=true;el.muted=true;el.playsInline=true;el.onended=()=>play();el.onerror=()=>play();}else{el.onerror=()=>play();timer=setTimeout(play,Math.max(3,item.displaySeconds||5)*1000);}stage.appendChild(el);requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('show')));if(item.kind==='video')timer=setTimeout(play,Math.max(35,(item.displaySeconds||30)+5)*1000);});}
play();
</script>
</body>
</html>`;
}

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const screenId = String(url.searchParams.get('screenId') || '').trim();
  const date = String(url.searchParams.get('date') || '').trim();
  if (!screenId || !validDate(date)) return NextResponse.json({ error: 'Informe a tela e a data.' }, { status: 400 });

  const admin = adminMidia();
  const { data: publisher } = await admin.from('publishers').select('id,slug,display_name,status').eq('user_id', user.id).maybeSingle();
  if (!publisher) return NextResponse.json({ error: 'Conta Midia.Pro não encontrada.' }, { status: 404 });

  const { data: screen, error: screenError } = await admin
    .from('screens')
    .select('id,location_id,name,public_code,commercial_mode,network_inventory_percent,inventory_class,status')
    .eq('id', screenId)
    .eq('publisher_id', publisher.id)
    .maybeSingle();
  if (screenError || !screen) return NextResponse.json({ error: 'Tela não encontrada.' }, { status: 404 });

  const { data: location } = await admin.from('locations').select('name,venue_type,timezone,city,state').eq('id', screen.location_id).maybeSingle();
  const timeZone = location?.timezone || 'America/Sao_Paulo';
  const start = zonedDateTimeToUtc(date, '00:00:00', timeZone);
  const end = zonedDateTimeToUtc(addDays(date, 1), '00:00:00', timeZone);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const [playlistResult, occurrenceResult, houseResult] = await Promise.all([
    admin.from('screen_playlist_items').select('id,creative_id,display_seconds,sort_order,source,active,valid_from,valid_until').eq('screen_id', screen.id).eq('active', true).order('sort_order'),
    admin.from('campaign_occurrences').select('id,campaign_id,creative_id,planned_at,window_end_at,display_seconds,status').eq('screen_id', screen.id).gte('planned_at', startIso).lt('planned_at', endIso).in('status', ['scheduled','played','delivered']).order('planned_at'),
    ['partner','hybrid'].includes(screen.commercial_mode) && Number(screen.network_inventory_percent || 0) > 0
      ? admin.from('house_creatives').select('id,name,advertiser_label,kind,file_name,mime_type,storage_path,size_bytes,duration_seconds,width,height,display_seconds,priority,starts_at,ends_at,target_inventory_classes,target_venue_types,updated_at').eq('status','ready').order('priority',{ascending:false}).order('created_at').limit(30)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (playlistResult.error || occurrenceResult.error || houseResult.error) {
    console.error('[midia/offline/export-manifest] schedule:', playlistResult.error || occurrenceResult.error || houseResult.error);
    return NextResponse.json({ error: 'Não foi possível montar a programação offline.' }, { status: 500 });
  }

  const activePlaylist = (playlistResult.data ?? []).filter((item) =>
    (!item.valid_from || new Date(item.valid_from).getTime() < end.getTime())
    && (!item.valid_until || new Date(item.valid_until).getTime() > start.getTime()),
  );
  const ownIds = [...new Set(activePlaylist.map((item) => item.creative_id))];
  const adIds = [...new Set((occurrenceResult.data ?? []).map((item) => item.creative_id))];

  const [ownResult, adResult] = await Promise.all([
    ownIds.length ? admin.from('creatives').select('id,kind,file_name,mime_type,storage_path,size_bytes,duration_seconds,width,height,status,updated_at').in('id', ownIds).eq('status','ready') : Promise.resolve({ data: [], error: null }),
    adIds.length ? admin.from('ad_creatives').select('id,kind,file_name,mime_type,storage_path,size_bytes,duration_seconds,width,height,status,updated_at').in('id', adIds).eq('status','ready') : Promise.resolve({ data: [], error: null }),
  ]);
  if (ownResult.error || adResult.error) {
    console.error('[midia/offline/export-manifest] creatives:', ownResult.error || adResult.error);
    return NextResponse.json({ error: 'Não foi possível carregar as mídias do dia.' }, { status: 500 });
  }

  const venueType = location?.venue_type || null;
  const eligibleHouse = (houseResult.data ?? []).filter((creative: any) => {
    if (creative.starts_at && new Date(creative.starts_at).getTime() >= end.getTime()) return false;
    if (creative.ends_at && new Date(creative.ends_at).getTime() <= start.getTime()) return false;
    const classes = Array.isArray(creative.target_inventory_classes) ? creative.target_inventory_classes : [];
    if (classes.length && !classes.includes(screen.inventory_class)) return false;
    const venues = Array.isArray(creative.target_venue_types) ? creative.target_venue_types : [];
    if (venues.length && (!venueType || !venues.includes(venueType))) return false;
    return true;
  });

  const ownById = new Map((ownResult.data ?? []).map((item) => [item.id, item]));
  const adById = new Map((adResult.data ?? []).map((item) => [item.id, item]));

  type AssetRecord = {
    assetId: string; category: 'own' | 'paid' | 'partner'; localFile: string; kind: 'image' | 'video';
    mimeType: string; sizeBytes: number; displaySeconds: number; storagePath: string; signedUrl?: string;
    advertiserLabel?: string;
  };
  const assetByKey = new Map<string, AssetRecord>();
  let counter = 1;
  const register = (creative: any, category: AssetRecord['category'], displaySeconds: number, advertiserLabel?: string) => {
    const key = `${category}:${creative.id}`;
    const existing = assetByKey.get(key);
    if (existing) return existing;
    const ext = extFor(creative.file_name, creative.mime_type);
    const prefix = String(counter++).padStart(3, '0');
    const localFile = `${prefix}-${category}-${safeName(String(creative.file_name || creative.id).replace(/\.[^.]+$/, ''))}.${ext}`;
    const asset: AssetRecord = {
      assetId: key,
      category,
      localFile,
      kind: creative.kind,
      mimeType: creative.mime_type,
      sizeBytes: Number(creative.size_bytes || 0),
      displaySeconds: Math.max(1, Number(displaySeconds || creative.duration_seconds || 5)),
      storagePath: creative.storage_path,
      advertiserLabel,
    };
    assetByKey.set(key, asset);
    return asset;
  };

  const ownEntries = activePlaylist.flatMap((item) => {
    const creative = ownById.get(item.creative_id);
    if (!creative) return [];
    return [register(creative, 'own', Number(item.display_seconds || 5))];
  });

  const scheduledEntries = (occurrenceResult.data ?? []).flatMap((occurrence) => {
    const creative = adById.get(occurrence.creative_id);
    if (!creative) return [];
    const asset = register(creative, 'paid', Number(occurrence.display_seconds || 30));
    return [{
      id: occurrence.id,
      campaignId: occurrence.campaign_id,
      kind: asset.kind,
      localFile: asset.localFile,
      displaySeconds: Number(occurrence.display_seconds || 30),
      plannedAt: occurrence.planned_at,
      windowEndAt: occurrence.window_end_at,
      status: occurrence.status,
    }];
  });

  const partnerEntries = eligibleHouse.map((creative: any) => register(creative, 'partner', Number(creative.display_seconds || creative.duration_seconds || 30), creative.advertiser_label));

  const assets = [...assetByKey.values()];
  const storage = adminMidiaStorage();
  const paths = assets.map((asset) => asset.storagePath);
  if (paths.length) {
    const { data: signed, error: signedError } = await storage.storage.from('midia-assets').createSignedUrls(paths, 60 * 60);
    if (signedError) {
      console.error('[midia/offline/export-manifest] signed urls:', signedError);
      return NextResponse.json({ error: 'Não foi possível preparar o download das mídias.' }, { status: 500 });
    }
    const signedByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
    for (const asset of assets) asset.signedUrl = signedByPath.get(asset.storagePath) || undefined;
  }

  if (assets.some((asset) => !asset.signedUrl)) {
    return NextResponse.json({ error: 'Uma ou mais mídias não puderam ser preparadas para download.' }, { status: 500 });
  }

  const publicOwn = ownEntries.map((asset) => ({ kind: asset.kind, localFile: asset.localFile, displaySeconds: asset.displaySeconds }));
  const publicPartner = partnerEntries.map((asset) => ({ kind: asset.kind, localFile: asset.localFile, displaySeconds: asset.displaySeconds, advertiserLabel: asset.advertiserLabel || 'Parceiro' }));
  const playlist = {
    version: 1,
    generatedAt: new Date().toISOString(),
    date,
    timeZone,
    realtime: false,
    automaticProofOfPlay: false,
    screen: {
      id: screen.id,
      name: screen.name,
      publicCode: screen.public_code,
      networkInventoryPercent: Number(screen.network_inventory_percent || 0),
    },
    publisher: { slug: publisher.slug, displayName: publisher.display_name },
    own: publicOwn,
    scheduled: scheduledEntries,
    partner: publicPartner,
  };

  const totalBytes = assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);
  const readme = [
    'MIDIA.PRO - PACOTE OFFLINE',
    '',
    `Tela: ${screen.name}`,
    `Data: ${date}`,
    `Fuso: ${timeZone}`,
    `Arquivos de mídia: ${assets.length}`,
    '',
    'IMPORTANTE:',
    '- Este pacote NÃO possui Realtime.',
    '- Alterações feitas no dashboard depois deste download não chegam ao pendrive.',
    '- O modo pendrive puro NÃO envia confirmação automática de exibição.',
    '- Campanhas pagas exibidas somente por pendrive não liberam saldo automaticamente.',
    '',
    'COMO USAR:',
    '1. Extraia todo o ZIP na raiz do pendrive.',
    '2. Em computador/mini-PC, abra player.html em tela cheia.',
    '3. Em TVs que não abrem HTML, os arquivos ficam na pasta media/. Nesse modo a TV faz apenas reprodução simples e não respeita horários com a mesma precisão.',
    '',
    'Para telas móveis (Uber/tablet), prefira o player web Midia.Pro e use a função Baixar programação de hoje. Esse modo sincroniza as exibições quando a internet voltar.',
  ].join('\n');

  return NextResponse.json({
    ok: true,
    fileName: `MidiaPro-${safeName(screen.name)}-${date}.zip`,
    totalBytes,
    assets: assets.map(({ storagePath, ...asset }) => asset),
    playlist,
    playerHtml: buildPlayerHtml(playlist),
    readme,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
