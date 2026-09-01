'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Clock3, MapPin, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import FuncionarIAAvatarPhoto from '@/components/funcionaria/visual/FuncionarIAAvatarPhoto';
import FuncionarIAInteraction from '@/components/funcionaria/interaction/FuncionarIAInteraction';
import { useFuncionarIATTS } from '@/components/funcionaria/interaction/useFuncionarIATTS';
import FuncionarIAHumanAssist from '@/components/funcionaria/assistance/FuncionarIAHumanAssist';
import { rgbaFromHex } from '@/lib/funcionaria-visual';

export default function FuncionarIAPublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params.slug || '');
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [humanReason, setHumanReason] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('funcionaria_public_profile', { p_slug: slug });
      if (!data?.company?.id) {
        setLoading(false);
        return;
      }
      setProfile(data);
      const productRes = await supabase
        .from('produtos_venda')
        .select('id,nome,descricao,imagem_url,preco_venda')
        .eq('company_id', data.company.id)
        .eq('is_active', true)
        .order('display_order')
        .limit(6);
      setProducts(productRes.data || []);
      setLoading(false);
    }
    if (slug) void load();
  }, [slug, supabase]);

  const voiceSpeed = Number(profile?.company?.voice_speed || 1.2);
  const voiceId = profile?.settings?.voice_id || null;
  const { playText, speaking, audioElement } = useFuncionarIATTS({ voiceId, speed: voiceSpeed });

  async function aiFallback(message: string): Promise<string | null> {
    if (!profile?.company?.id) return null;
    try {
      const response = await fetch('/api/funcionaria/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: profile.company.id, message, source: 'webapp' }),
      });
      const data = await response.json().catch(() => ({}));
      return response.ok && data?.ok && data?.answer ? String(data.answer) : null;
    } catch {
      return null;
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 py-24 text-center text-sm font-bold text-slate-400">Carregando atendimento…</main>;
  }
  if (!profile?.company) {
    return <main className="min-h-screen bg-slate-50 py-24 text-center"><h1 className="text-2xl font-black">FuncionarIA não encontrada</h1></main>;
  }

  const company = profile.company;
  const settings = profile.settings || {};
  const primary = settings.primary_color || '#6D28D9';
  const secondary = settings.secondary_color || '#A3E635';
  const activeSkillKeys = Array.isArray(profile.active_skill_keys) ? profile.active_skill_keys : [];
  const activeFunctionKeys = Array.isArray(profile.active_function_keys) ? profile.active_function_keys : [];

  return (
    <main
      className="min-h-screen text-slate-950"
      style={{
        background: `radial-gradient(circle at 10% 0%, ${rgbaFromHex(primary, .10)}, transparent 28%), radial-gradient(circle at 100% 20%, ${rgbaFromHex(secondary, .16)}, transparent 30%), #F8FAFC`,
      }}
    >
      <div className="mx-auto max-w-[1450px] px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <header className="flex items-center justify-between gap-4 rounded-[24px] border border-black/5 bg-white/[.92] p-3 shadow-sm backdrop-blur-xl sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white sm:h-12 sm:w-12">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-base font-black" style={{ color: primary }}>{String(company.name || 'E').slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black sm:text-lg">{company.name}</h1>
              <p className="truncate text-[11px] font-bold text-slate-400 sm:text-xs">Atendimento online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-full px-3 py-1.5 text-xs font-black sm:block" style={{ backgroundColor: rgbaFromHex(primary, .09), color: primary }}>Online agora</div>
            <Image src="/brands/funcionaria/logo.png" alt="FuncionarIA" width={42} height={42} className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
          </div>
        </header>

        <section className="mt-4 overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-xl shadow-slate-950/5">
          <div className="grid items-stretch lg:grid-cols-[minmax(0,1.05fr)_440px]">
            {/*
              A coluna do avatar era `min-h-[760px]` fixa e a de conteudo
              crescia com o texto, entao as duas quase nunca terminavam na mesma
              altura. Com `lg:h-full` ela acompanha a coluna vizinha, e o avatar
              preenche o espaco que sobrar em vez de definir a altura do cartao.
            */}
            <div className="relative overflow-hidden border-b border-black/5 bg-white lg:h-full lg:border-b-0 lg:border-r">
              <FuncionarIAAvatarPhoto
                primaryColor={primary}
                secondaryColor={secondary}
                shirtColor={settings.shirt_color || primary}
                shirtDetailColor={settings.shirt_detail_color || secondary}
                uniformLogoUrl={settings.uniform_logo_url}
                companyLogoUrl={company.logo_url}
                backgroundPreset={settings.background_preset || 'escritorio'}
                backgroundUrl={settings.background_url}
                counter={settings.counter || 'nenhum'}
                logoPlacement={settings.logo_placement || 'cracha'}
                speaking={speaking}
                audioElement={audioElement}
                className="h-full !min-h-[420px] sm:!min-h-[520px]"
              />

            </div>

            <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.98))] p-3 sm:p-4 lg:p-5">
              <div className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur-xl sm:p-4">
                <div className="mb-3 rounded-[22px] border border-violet-100 bg-white px-4 py-4 shadow-sm sm:px-5">
                  {/*
                    Textos escritos para quem chega no site, nao para quem
                    administra o sistema. "Funcao", "inteligente" e o nome do
                    produto sao vocabulario interno — o cliente quer saber se
                    tem alguem para atender, nao como o atendimento funciona.
                  */}
                  <div className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: primary }}>Estamos online</div>
                  <div className="mt-1 text-lg font-black leading-tight text-slate-950 sm:text-xl">Fale com a {company.name}</div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Escreva sua dúvida, escolha uma opção ou use o microfone.</p>
                </div>

                <FuncionarIAInteraction
                  company={company}
                  activeSkillKeys={activeSkillKeys}
                  activeFunctionKeys={activeFunctionKeys}
                  aiEnabled={settings.ai_enabled === true}
                  clientFacing
                  voiceInputEnabled={settings.voice_input_enabled === true}
                  source="webapp"
                  onAiFallback={aiFallback}
                  primaryColor={primary}
                  secondaryColor={secondary}
                  playText={playText}
                  onCallHuman={(reason) => setHumanReason(reason || 'Cliente solicitou atendimento humano.')}
                  variant="panel"
                />
              </div>
            </div>
          </div>
        </section>

        {(company.business_hours || company.business_address) && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {company.business_hours && (
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <Clock3 className="h-5 w-5" style={{ color: primary }} />
                <div className="mt-2 text-xs font-black text-slate-400">HORÁRIOS</div>
                <div className="mt-1 text-sm font-bold">{company.business_hours}</div>
              </div>
            )}
            {company.business_address && (
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <MapPin className="h-5 w-5" style={{ color: primary }} />
                <div className="mt-2 text-xs font-black text-slate-400">ENDEREÇO</div>
                <div className="mt-1 text-sm font-bold">{company.business_address}</div>
              </div>
            )}
          </div>
        )}

        {products.length > 0 && (
          <section id="produtos" className="mt-4 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" style={{ color: primary }} />
              <h3 className="text-lg font-black">Produtos</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map(product => (
                <div key={product.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="font-black">{product.nome}</div>
                  {product.descricao && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{product.descricao}</p>}
                  <div className="mt-3 text-sm font-black" style={{ color: primary }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.preco_venda || 0))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="py-7 text-center text-xs font-bold text-slate-400">FuncionarIA — a funcionária IA que veste a camisa da sua empresa, no presencial e no online.</footer>
      </div>

      {humanReason && (
        <FuncionarIAHumanAssist
          companyId={company.id}
          reason={humanReason}
          onClose={() => setHumanReason(null)}
          playText={playText}
        />
      )}
    </main>
  );
}
