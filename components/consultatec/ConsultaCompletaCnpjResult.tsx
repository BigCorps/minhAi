'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, BadgeCheck, Building2, FileWarning, Gauge, Users } from 'lucide-react';

const cor = {
  fundo: '#FBF6E9',
  fundoAlt: '#F2EAD3',
  borda: '#C9BFA0',
  tinta: '#1C1A14',
  muted: '#6B6350',
  destaque: '#7A6142',
  erro: '#7A2E2E',
};

const txt = (value: any, fallback = 'Não informado') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value);
};

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: cor.muted }}>{label}</p>
      <p className="text-sm font-medium break-words" style={{ color: cor.tinta }}>{txt(value)}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border overflow-hidden" style={{ borderColor: cor.borda, backgroundColor: cor.fundo }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: cor.borda, backgroundColor: cor.fundoAlt }}>
        {icon}
        <h3 className="font-bold text-sm" style={{ color: cor.tinta }}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function ConsultaCompletaCnpjResult({ result }: { result: any }) {
  const dados = result?.dados ?? {};
  const restricoes = result?.restricoes ?? {};
  const score = result?.score ?? restricoes?.score ?? {};
  const scoreNumero = Number(score?.score);
  const temScore = Number.isFinite(scoreNumero) && scoreNumero >= 0 && scoreNumero <= 1000;
  const qsa = Array.isArray(dados?.qsa) ? dados.qsa : [];
  const cnaes = Array.isArray(dados?.cnaes_secundarios) ? dados.cnaes_secundarios : [];
  const blocosRestricao = Array.isArray(restricoes?.restricoes) ? restricoes.restricoes : [];
  const detalhesProtestos = Array.isArray(result?.protestos?.detalhes)
    ? result.protestos.detalhes
    : Array.isArray(restricoes?.protestos?.detalhes)
      ? restricoes.protestos.detalhes
      : [];
  const adicionais = Array.isArray(restricoes?.campos_adicionais) ? restricoes.campos_adicionais : [];
  const alertas = Array.isArray(result?.alertas) ? result.alertas : [];

  return (
    <div className="space-y-3">
      {alertas.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {alertas.map((a: any, index: number) => {
            const critico = a?.nivel === 'critico';
            return (
              <div
                key={`${a?.titulo ?? 'alerta'}-${index}`}
                className="rounded-xl border p-3 flex items-start gap-2"
                style={{ borderColor: critico ? cor.erro : cor.borda, backgroundColor: critico ? '#F4E4E0' : cor.fundoAlt }}
              >
                {critico
                  ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: cor.erro }} />
                  : <BadgeCheck className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: cor.destaque }} />}
                <div>
                  <p className="text-xs font-bold" style={{ color: critico ? cor.erro : cor.tinta }}>{txt(a?.titulo, 'Alerta')}</p>
                  <p className="text-xs mt-0.5" style={{ color: cor.muted }}>{txt(a?.detalhe)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Section title="Score e risco" icon={<Gauge className="w-4 h-4" style={{ color: cor.destaque }} />}>
        {temScore ? (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold" style={{ color: cor.tinta }}>{Math.round(scoreNumero)}</p>
                <p className="text-xs" style={{ color: cor.muted }}>de 1000 pontos</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold" style={{ color: cor.tinta }}>{txt(score?.risco, 'Faixa não informada')}</p>
                <p className="text-[11px]" style={{ color: cor.muted }}>{txt(score?.fonte, 'Quod via APIBrasil')}</p>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#DED4B9' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, scoreNumero / 10))}%`, backgroundColor: cor.destaque }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Info label="Probabilidade de inadimplência" value={score?.probabilidade_inadimplencia} />
              <Info label="Fonte" value={score?.fonte} />
            </div>
            {Array.isArray(score?.motivos) && score.motivos.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: cor.muted }}>Fatores informados pelo fornecedor</p>
                <ul className="text-xs space-y-1 list-disc pl-4" style={{ color: cor.tinta }}>
                  {score.motivos.map((m: string, i: number) => <li key={`${m}-${i}`}>{m}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg p-3" style={{ backgroundColor: cor.fundoAlt }}>
            <p className="text-sm font-semibold" style={{ color: cor.tinta }}>Score numérico não retornado pelo produto Quod atual.</p>
            <p className="text-xs mt-1" style={{ color: cor.muted }}>
              A ConsultaTec não estima nem inventa pontuação. Quando conectarmos o produto de score dedicado, este bloco passa a exibir a nota e os indicadores oficiais.
            </p>
          </div>
        )}
      </Section>

      <Section title="Cadastro da empresa" icon={<Building2 className="w-4 h-4" style={{ color: cor.destaque }} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
          <Info label="CNPJ" value={dados?.cnpj} />
          <Info label="Situação" value={dados?.situacao} />
          <Info label="Razão social" value={dados?.razao_social} />
          <Info label="Nome fantasia" value={dados?.nome_fantasia} />
          <Info label="Matriz / filial" value={dados?.matriz_filial} />
          <Info label="Início das atividades" value={dados?.data_inicio_atividade} />
          <Info label="Natureza jurídica" value={dados?.natureza_juridica} />
          <Info label="Porte" value={dados?.porte} />
          <Info label="Capital social" value={dados?.capital_social} />
          <Info label="Fonte cadastral" value={dados?.fonte} />
        </div>
        {(dados?.cnae_principal?.codigo || dados?.cnae_principal?.descricao) && (
          <div className="mt-4 pt-3 border-t" style={{ borderColor: cor.borda }}>
            <Info label="CNAE principal" value={`${txt(dados.cnae_principal.codigo, '')} ${txt(dados.cnae_principal.descricao, '')}`.trim()} />
          </div>
        )}
      </Section>

      {qsa.length > 0 && (
        <Section title={`Quadro societário (${qsa.length})`} icon={<Users className="w-4 h-4" style={{ color: cor.destaque }} />}>
          <div className="space-y-2">
            {qsa.map((s: any, index: number) => (
              <div key={`${s?.nome ?? 'socio'}-${index}`} className="rounded-lg border p-3" style={{ borderColor: cor.borda, backgroundColor: index % 2 === 0 ? cor.fundoAlt : cor.fundo }}>
                <p className="text-sm font-semibold" style={{ color: cor.tinta }}>{txt(s?.nome)}</p>
                <p className="text-xs mt-0.5" style={{ color: cor.muted }}>{txt(s?.qualificacao)}</p>
                {(s?.data_entrada || s?.faixa_etaria) && (
                  <p className="text-[11px] mt-1" style={{ color: cor.muted }}>
                    {[s?.data_entrada ? `Entrada: ${s.data_entrada}` : '', s?.faixa_etaria ? `Faixa: ${s.faixa_etaria}` : ''].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {cnaes.length > 0 && (
        <Section title={`CNAEs secundários (${cnaes.length})`}>
          <div className="max-h-52 overflow-y-auto divide-y" style={{ borderColor: cor.borda }}>
            {cnaes.map((c: any, index: number) => (
              <div key={`${c?.codigo ?? 'cnae'}-${index}`} className="py-2 first:pt-0 last:pb-0">
                <p className="text-xs font-semibold" style={{ color: cor.tinta }}>{txt(c?.codigo)}</p>
                <p className="text-xs" style={{ color: cor.muted }}>{txt(c?.descricao)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Restrições e apontamentos" icon={<FileWarning className="w-4 h-4" style={{ color: cor.destaque }} />}>
        {blocosRestricao.length === 0 ? (
          <p className="text-sm" style={{ color: cor.muted }}>Nenhuma categoria de restrição retornada.</p>
        ) : (
          <div className="space-y-2">
            {blocosRestricao.map((r: any, index: number) => (
              <div key={`${r?.tipo ?? 'restricao'}-${index}`} className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border p-3" style={{ borderColor: cor.borda, backgroundColor: cor.fundoAlt }}>
                <div className="col-span-2 sm:col-span-1"><Info label="Tipo" value={r?.tipo} /></div>
                <Info label="Quantidade" value={r?.quantidade} />
                <Info label="Valor total" value={r?.valor_total} />
                <Info label="Última ocorrência" value={r?.data_ultimo} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {detalhesProtestos.length > 0 && (
        <Section title={`Protestos detalhados (${detalhesProtestos.length})`}>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {detalhesProtestos.map((p: any, index: number) => (
              <div key={index} className="rounded-lg border p-3" style={{ borderColor: cor.borda, backgroundColor: index % 2 === 0 ? cor.fundoAlt : cor.fundo }}>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(p ?? {}).slice(0, 10).map(([k, v]) => (
                    <Info key={k} label={k.replace(/_/g, ' ')} value={v} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Endereço e contatos">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
          <Info label="Endereço" value={[dados?.endereco?.logradouro, dados?.endereco?.numero, dados?.endereco?.complemento].filter(Boolean).join(', ')} />
          <Info label="Bairro" value={dados?.endereco?.bairro} />
          <Info label="Cidade / UF" value={[dados?.endereco?.municipio, dados?.endereco?.uf].filter(Boolean).join(' / ')} />
          <Info label="CEP" value={dados?.endereco?.cep} />
          <Info label="E-mail" value={dados?.contatos?.email} />
          <Info label="Telefones" value={Array.isArray(dados?.contatos?.telefones) ? dados.contatos.telefones.join(' · ') : dados?.contatos?.telefones} />
        </div>
      </Section>

      {adicionais.length > 0 && (
        <details className="rounded-xl border overflow-hidden" style={{ borderColor: cor.borda, backgroundColor: cor.fundo }}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold" style={{ color: cor.tinta, backgroundColor: cor.fundoAlt }}>
            Mais informações retornadas pelo fornecedor ({adicionais.length})
          </summary>
          <div className="p-4 max-h-72 overflow-y-auto space-y-2">
            {adicionais.map((item: any, index: number) => (
              <div key={`${item?.campo ?? 'campo'}-${index}`} className="grid grid-cols-3 gap-3 text-xs">
                <span className="font-semibold break-words" style={{ color: cor.muted }}>{txt(item?.campo)}</span>
                <span className="col-span-2 break-words" style={{ color: cor.tinta }}>{txt(item?.valor)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {result?.observacao && (
        <p className="text-[11px] leading-relaxed" style={{ color: cor.muted }}>{result.observacao}</p>
      )}
    </div>
  );
}
