'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CheckCircle2, Loader2, MailCheck, Plus, Search, Trash2, X } from 'lucide-react';
import { tokensDoConvite } from '@/lib/conviteria/tokens';

type EmailStatus = 'enviado' | 'sem_google' | 'falhou' | null;
type PessoaRestrita = { id: string; nome: string; tipo: 'adulto' | 'crianca'; idade?: number | null; status: string };
type PessoaAdicional = { nome: string; tipo: 'adulto' | 'crianca'; idade: number | null };
const novaPessoaAdicional = (): PessoaAdicional => ({ nome: '', tipo: 'adulto', idade: null });

export default function ModalRSVP({
  eventoId,
  temaId,
  fonteId,
  tokenInicial,
  aoFechar,
}: {
  eventoId: string;
  temaId: string;
  fonteId: string;
  tokenInicial?: string | null;
  aoFechar: () => void;
}) {
  const [montado, setMontado] = useState(false);
  const [restrito, setRestrito] = useState<boolean | null>(null);
  const [prazoRsvp, setPrazoRsvp] = useState<string | null>(null);
  const [prazoEncerrado, setPrazoEncerrado] = useState(false);
  const [mensagemEncerrado, setMensagemEncerrado] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [familia, setFamilia] = useState<PessoaAdicional[]>([]);
  const [contato, setContato] = useState('');
  const [grupoTitulo, setGrupoTitulo] = useState('');
  const [pessoas, setPessoas] = useState<PessoaRestrita[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [idadesCriancas, setIdadesCriancas] = useState<Record<string, number | null>>({});
  const [extrasPermitidos, setExtrasPermitidos] = useState(0);
  const [extras, setExtras] = useState<PessoaAdicional[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmado, setConfirmado] = useState<number | null>(null);
  const [atualizado, setAtualizado] = useState(false);
  const [agendaUrl, setAgendaUrl] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>(null);
  const solicitacaoId = useRef<string | null>(null);
  const porLink = Boolean(tokenInicial);

  useEffect(() => {
    setMontado(true);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', tecla);

    (async () => {
      try {
        const cfg = await fetch(`/api/conviteria/rsvp?eventoId=${encodeURIComponent(eventoId)}`, { cache: 'no-store' }).then((r) => r.json());
        setRestrito(porLink ? true : Boolean(cfg?.identificado ?? cfg?.restrito));
        setPrazoRsvp(typeof cfg?.prazo === 'string' ? cfg.prazo : null);
        setPrazoEncerrado(Boolean(cfg?.encerrado));
        setMensagemEncerrado(typeof cfg?.mensagemEncerrado === 'string' ? cfg.mensagemEncerrado : '');
        if (cfg?.encerrado) return;
        if (tokenInicial) await buscarPorToken(tokenInicial);
      } catch {
        setRestrito(porLink);
        if (tokenInicial) setErro('Não foi possível localizar este convite individual.');
      }
    })();

    return () => {
      document.body.style.overflow = antes;
      document.removeEventListener('keydown', tecla);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aoFechar, eventoId, tokenInicial]);

  if (!montado) return null;

  const prazoFormatado = prazoRsvp
    ? prazoRsvp.split('-').reverse().join('/')
    : null;

  function tratarErroPrazo(d: any) {
    if (d?.codigo !== 'RSVP_PRAZO_ENCERRADO') return;
    setPrazoEncerrado(true);
    if (typeof d?.prazo === 'string') setPrazoRsvp(d.prazo);
    setMensagemEncerrado(d?.erro || 'O prazo de confirmação deste evento foi encerrado.');
  }

  function adicionar() { if (familia.length < 20) setFamilia((f) => [...f, novaPessoaAdicional()]); }
  function alterar(i: number, patch: Partial<PessoaAdicional>) {
    setFamilia((f) => f.map((v, idx) => idx === i ? { ...v, ...patch, ...(patch.tipo === 'adulto' ? { idade: null } : {}) } : v));
  }
  function remover(i: number) { setFamilia((f) => f.filter((_, idx) => idx !== i)); }

  function adicionarExtra() {
    if (extras.length < extrasPermitidos) setExtras((atuais) => [...atuais, novaPessoaAdicional()]);
  }
  function alterarExtra(i: number, patch: Partial<PessoaAdicional>) {
    setExtras((atuais) => atuais.map((v, idx) => idx === i ? { ...v, ...patch, ...(patch.tipo === 'adulto' ? { idade: null } : {}) } : v));
  }
  function removerExtra(i: number) {
    setExtras((atuais) => atuais.filter((_, idx) => idx !== i));
  }

  function idadeValida(p: PessoaAdicional) {
    return p.tipo !== 'crianca' || (Number.isInteger(p.idade) && Number(p.idade) >= 1 && Number(p.idade) <= 12);
  }

  function aplicarGrupo(d: any) {
    const grupo = d.grupo ?? {};
    setGrupoTitulo(grupo.titulo ?? 'Convidados');
    setPessoas(grupo.pessoas ?? []);
    setContato(grupo.telefonePrincipal ?? contato);
    setEmail(typeof grupo.emailPrincipal === 'string' ? grupo.emailPrincipal : '');
    setExtrasPermitidos(Math.max(0, Number(grupo.extrasPermitidos ?? 0)));
    setExtras((grupo.extrasAtuais ?? []).map((x: any) => ({
      nome: String(x?.nome ?? ''),
      tipo: x?.tipo === 'crianca' ? 'crianca' : 'adulto',
      idade: x?.tipo === 'crianca' && Number(x?.idade) >= 1 && Number(x?.idade) <= 12 ? Number(x.idade) : null,
    })).filter((x: PessoaAdicional) => x.nome));
    setSelecionados((grupo.pessoas ?? [])
      .filter((p: PessoaRestrita) => p.status !== 'nao_vai')
      .map((p: PessoaRestrita) => p.id));
    setIdadesCriancas(Object.fromEntries((grupo.pessoas ?? [])
      .filter((p: PessoaRestrita) => p.tipo === 'crianca')
      .map((p: PessoaRestrita) => [p.id, p.idade ?? null])));
  }

  async function buscarPorToken(token: string) {
    setErro('');
    setEnviando(true);
    try {
      const r = await fetch('/api/conviteria/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventoId, acao: 'buscar_token', tokenConvite: token }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { tratarErroPrazo(d); throw new Error(d?.erro || 'Este link de confirmação não foi encontrado.'); }
      aplicarGrupo(d);
    } catch (e: any) {
      setPessoas([]);
      setExtras([]);
      setExtrasPermitidos(0);
      setErro(e.message || 'Este link de confirmação não foi encontrado.');
    } finally {
      setEnviando(false);
    }
  }

  async function buscarRestrito() {
    setErro('');
    setEnviando(true);
    try {
      const r = await fetch('/api/conviteria/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventoId, acao: 'buscar_restrito', contato }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { tratarErroPrazo(d); throw new Error(d?.erro || 'Não encontramos este contato.'); }
      aplicarGrupo(d);
    } catch (e: any) {
      setPessoas([]);
      setExtras([]);
      setExtrasPermitidos(0);
      setErro(e.message || 'Não encontramos este contato.');
    } finally {
      setEnviando(false);
    }
  }

  async function confirmar() {
    setErro('');
    const modoLista = porLink || restrito;
    if (modoLista) {
      if (!pessoas.length) return setErro('Não foi possível localizar os nomes deste convite.');
      if (!selecionados.length) return setErro('Selecione ao menos uma pessoa convidada que irá ao evento.');
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro('Informe um e-mail válido ou deixe o campo vazio.');
      const criancaFixaSemIdade = pessoas.find((p) => p.tipo === 'crianca' && selecionados.includes(p.id) && (!Number.isInteger(idadesCriancas[p.id]) || Number(idadesCriancas[p.id]) < 1 || Number(idadesCriancas[p.id]) > 12));
      if (criancaFixaSemIdade) return setErro(`Informe a idade de ${criancaFixaSemIdade.nome} (de 1 a 12 anos).`);
      const extrasPreenchidos = extras.map((x) => ({ ...x, nome: x.nome.trim() })).filter((x) => x.nome);
      if (extrasPreenchidos.length > extrasPermitidos) return setErro(`Este convite permite até ${extrasPermitidos} acompanhante(s) extra(s).`);
      const criancaSemIdade = extrasPreenchidos.find((x) => !idadeValida(x));
      if (criancaSemIdade) return setErro(`Informe a idade de ${criancaSemIdade.nome} (de 1 a 12 anos).`);
    } else {
      if (nome.trim().length < 2) return setErro('Informe seu nome.');
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro('Informe um e-mail válido ou deixe o campo vazio.');
      const digitos = telefone.replace(/\D/g, '');
      if (digitos.length < 8) return setErro('Informe seu telefone/WhatsApp para identificar a confirmação.');
      const familiares = familia.map((x) => ({ ...x, nome: x.nome.trim() })).filter((x) => x.nome);
      const criancaSemIdade = familiares.find((x) => !idadeValida(x));
      if (criancaSemIdade) return setErro(`Informe a idade de ${criancaSemIdade.nome} (de 1 a 12 anos).`);
    }

    setEnviando(true);
    const id = solicitacaoId.current ?? crypto.randomUUID();
    solicitacaoId.current = id;

    try {
      const payload = porLink
        ? {
            eventoId,
            acao: 'confirmar_token',
            tokenConvite: tokenInicial,
            convidadoIds: selecionados,
            email: email.trim(),
            idadesCriancas,
            acompanhantesExtras: extras.map((x) => ({ ...x, nome: x.nome.trim() })).filter((x) => x.nome),
            solicitacaoId: id,
          }
        : restrito
          ? {
              eventoId,
              acao: 'confirmar_restrito',
              contato,
              convidadoIds: selecionados,
              email: email.trim(),
              idadesCriancas,
              acompanhantesExtras: extras.map((x) => ({ ...x, nome: x.nome.trim() })).filter((x) => x.nome),
              solicitacaoId: id,
            }
          : {
              eventoId,
              nome: nome.trim(),
              email: email.trim(),
              telefone: telefone.trim(),
              acompanhantes: familia.map((x) => ({ ...x, nome: x.nome.trim() })).filter((x) => x.nome),
              solicitacaoId: id,
            };

      const r = await fetch('/api/conviteria/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { tratarErroPrazo(d); throw new Error(d?.erro || 'Não foi possível confirmar.'); }

      setConfirmado(Number(d.totalPessoas ?? 1));
      setAtualizado(Boolean(d.atualizado));
      setAgendaUrl(typeof d.agendaUrl === 'string' ? d.agendaUrl : null);
      setEmailStatus(['enviado', 'sem_google', 'falhou'].includes(d.emailStatus) ? d.emailStatus : null);
      solicitacaoId.current = null;
    } catch (e: any) {
      setErro(e.message || 'Não foi possível confirmar sua presença.');
    } finally {
      setEnviando(false);
    }
  }

  return createPortal(
    <div
      className="cv-modal-fundo"
      style={tokensDoConvite(temaId, fonteId)}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmação de presença"
      onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
    >
      <div className="cv-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="cv-modal-topo">
          <h2>Confirmar presença</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar"><X className="w-5 h-5" /></button>
        </header>

        <div className="cv-modal-corpo">
          {restrito == null ? (
            <div className="cv-modal-centro"><Loader2 className="w-7 h-7 animate-spin" /><p>Carregando…</p></div>
          ) : prazoEncerrado ? (
            <div className="cv-modal-centro">
              <CalendarDays className="w-12 h-12" />
              <p className="cv-modal-valor">Confirmações encerradas</p>
              <p className="cv-modal-dica">{mensagemEncerrado || 'O prazo de confirmação deste evento foi encerrado. Em caso de dúvida, entre em contato com os anfitriões.'}</p>
              <div className="cv-rsvp-acoes-sucesso">
                <button type="button" className="cv-rsvp-voltar" onClick={aoFechar}>Voltar ao convite</button>
              </div>
            </div>
          ) : confirmado == null ? (
            <div className="cv-modal-form">
              {prazoFormatado && <p className="cv-rsvp-intro"><strong>Confirme sua presença até {prazoFormatado}.</strong> Depois dessa data, a confirmação online será encerrada.</p>}
              {(restrito || porLink) ? (
                <>
                  {porLink ? (
                    <p className="cv-rsvp-intro">Confira os nomes abaixo e marque quem estará presente.</p>
                  ) : (
                    <>
                      <p className="cv-rsvp-intro">Este evento usa lista de convidados. Informe o telefone/WhatsApp cadastrado para localizar sua família.</p>
                      <label>
                        Telefone / WhatsApp
                        <input
                          type="tel"
                          maxLength={40}
                          autoComplete="tel"
                          placeholder="(11) 99999-9999"
                          value={contato}
                          onChange={(e) => {
                            setContato(e.target.value);
                            setEmail('');
                            setPessoas([]);
                            setExtras([]);
                            setExtrasPermitidos(0);
                            setGrupoTitulo('');
                            setIdadesCriancas({});
                          }}
                        />
                      </label>
                      <button type="button" className="cv-botao cv-botao-icone" disabled={enviando || contato.trim().length < 5} onClick={buscarRestrito}>
                        {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Localizar convite
                      </button>
                    </>
                  )}

                  {pessoas.length > 0 && (
                    <label>
                      Seu e-mail <small>(opcional)</small>
                      <input type="email" maxLength={180} autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                      <small style={{ display: 'block', marginTop: 6, opacity: .78 }}>Se informar o e-mail, você também poderá receber lembretes e atualizações deste evento por e-mail.</small>
                    </label>
                  )}

                  {pessoas.length > 0 && (
                    <div className="cv-rsvp-familia">
                      <div className="cv-rsvp-familia-topo"><div><strong>{grupoTitulo}</strong><small>Marque os membros do grupo que irão ao evento.</small></div></div>
                      <div className="cv-rsvp-pessoas">
                        {pessoas.map((p) => (
                          <label key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10 }}>
                            <input
                              type="checkbox"
                              checked={selecionados.includes(p.id)}
                              onChange={(e) => setSelecionados((s) => e.target.checked ? [...s, p.id] : s.filter((id) => id !== p.id))}
                            />
                            <span style={{ flex: 1 }}>{p.nome}<small style={{ display: 'block', opacity: .75 }}>{p.tipo === 'crianca' ? 'Criança' : 'Adulto'}</small></span>
                            {p.tipo === 'crianca' && selecionados.includes(p.id) && <select value={idadesCriancas[p.id] ?? ''} onChange={(e) => setIdadesCriancas((atuais) => ({ ...atuais, [p.id]: e.target.value ? Number(e.target.value) : null }))} aria-label={`Idade de ${p.nome}`} style={{ minHeight: 40 }}>
                              <option value="">Idade</option>{Array.from({ length: 12 }, (_, n) => n + 1).map((idade) => <option key={idade} value={idade}>{idade} {idade === 1 ? 'ano' : 'anos'}</option>)}
                            </select>}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {pessoas.length > 0 && extrasPermitidos > 0 && (
                    <div className="cv-rsvp-familia">
                      <div className="cv-rsvp-familia-topo">
                        <div><strong>Acompanhantes extras</strong><small>Você pode informar até {extrasPermitidos} {extrasPermitidos === 1 ? 'pessoa adicional' : 'pessoas adicionais'}.</small></div>
                        <button type="button" onClick={adicionarExtra} disabled={extras.length >= extrasPermitidos}><Plus className="w-4 h-4" />Adicionar</button>
                      </div>
                      {extras.length === 0 && <p className="cv-rsvp-sozinho">Este campo é opcional. Os membros já cadastrados ficam separados dos acompanhantes extras.</p>}
                      <div className="cv-rsvp-pessoas">
                        {extras.map((extra, i) => (
                          <div className="cv-rsvp-pessoa" key={i} style={{ alignItems: 'stretch', flexWrap: 'wrap' }}>
                            <input type="text" maxLength={120} placeholder={`Acompanhante extra ${i + 1}`} value={extra.nome} onChange={(e) => alterarExtra(i, { nome: e.target.value })} style={{ minWidth: 180, flex: '1 1 220px' }} />
                            <select value={extra.tipo} onChange={(e) => alterarExtra(i, { tipo: e.target.value === 'crianca' ? 'crianca' : 'adulto' })} aria-label={`Tipo do acompanhante ${i + 1}`} style={{ minHeight: 44 }}>
                              <option value="adulto">Adulto</option><option value="crianca">Criança</option>
                            </select>
                            {extra.tipo === 'crianca' && <select value={extra.idade ?? ''} onChange={(e) => alterarExtra(i, { idade: e.target.value ? Number(e.target.value) : null })} aria-label={`Idade do acompanhante ${i + 1}`} style={{ minHeight: 44 }}>
                              <option value="">Idade</option>{Array.from({ length: 12 }, (_, n) => n + 1).map((idade) => <option key={idade} value={idade}>{idade} {idade === 1 ? 'ano' : 'anos'}</option>)}
                            </select>}
                            <button type="button" onClick={() => removerExtra(i)} aria-label="Remover acompanhante extra"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="cv-rsvp-intro">Informe quem irá ao evento. O telefone/WhatsApp identifica sua confirmação para que ela possa ser atualizada depois.</p>
                  <label>Seu nome<input type="text" maxLength={120} autoComplete="name" placeholder="Ex.: Ana Silva" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
                  <label>Seu telefone / WhatsApp<input type="tel" maxLength={40} autoComplete="tel" placeholder="(11) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></label>
                  <label>Seu e-mail <small>(opcional)</small><input type="email" maxLength={180} autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /><small style={{ display: 'block', marginTop: 6, opacity: .78 }}>Se informar o e-mail, você também poderá receber lembretes e atualizações deste evento por e-mail.</small></label>
                  <div className="cv-rsvp-familia">
                    <div className="cv-rsvp-familia-topo">
                      <div><strong>Pessoas da sua família que também irão</strong><small>Não repita seu próprio nome.</small></div>
                      <button type="button" onClick={adicionar} disabled={familia.length >= 20}><Plus className="w-4 h-4" />Adicionar</button>
                    </div>
                    {familia.length === 0 && <p className="cv-rsvp-sozinho">Se for somente você, pode confirmar assim mesmo.</p>}
                    <div className="cv-rsvp-pessoas">
                      {familia.map((pessoa, i) => (
                        <div className="cv-rsvp-pessoa" key={i} style={{ alignItems: 'stretch', flexWrap: 'wrap' }}>
                          <input type="text" maxLength={120} placeholder={`Pessoa ${i + 2}`} value={pessoa.nome} onChange={(e) => alterar(i, { nome: e.target.value })} style={{ minWidth: 180, flex: '1 1 220px' }} />
                          <select value={pessoa.tipo} onChange={(e) => alterar(i, { tipo: e.target.value === 'crianca' ? 'crianca' : 'adulto' })} aria-label={`Tipo da pessoa ${i + 2}`} style={{ minHeight: 44 }}>
                            <option value="adulto">Adulto</option><option value="crianca">Criança</option>
                          </select>
                          {pessoa.tipo === 'crianca' && <select value={pessoa.idade ?? ''} onChange={(e) => alterar(i, { idade: e.target.value ? Number(e.target.value) : null })} aria-label={`Idade da pessoa ${i + 2}`} style={{ minHeight: 44 }}>
                            <option value="">Idade</option>{Array.from({ length: 12 }, (_, n) => n + 1).map((idade) => <option key={idade} value={idade}>{idade} {idade === 1 ? 'ano' : 'anos'}</option>)}
                          </select>}
                          <button type="button" onClick={() => remover(i)} aria-label="Remover pessoa"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {erro && <p className="cv-modal-erro">{erro}</p>}
              {(!(restrito || porLink) || pessoas.length > 0) && (
                <button type="button" className="cv-botao cv-botao-icone" disabled={enviando} onClick={confirmar}>
                  {enviando && <Loader2 className="w-4 h-4 animate-spin" />}{enviando ? 'Confirmando…' : 'Confirmar presença'}
                </button>
              )}
              <p className="cv-rsvp-privacidade">Os dados são usados pelos anfitriões somente para a organização deste evento.</p>
            </div>
          ) : (
            <div className="cv-modal-centro">
              <CheckCircle2 className="w-12 h-12" />
              <p className="cv-modal-valor">{atualizado ? 'Confirmação atualizada!' : 'Presença confirmada!'}</p>
              <p className="cv-modal-dica">{confirmado === 1 ? 'Confirmamos a presença de 1 pessoa.' : `Confirmamos a presença de ${confirmado} pessoas.`}</p>
              {emailStatus === 'enviado' && <p className="cv-rsvp-email-ok"><MailCheck className="w-4 h-4" />Enviamos a confirmação por e-mail.</p>}
              <div className="cv-rsvp-acoes-sucesso">
                {agendaUrl && <a href={agendaUrl} target="_blank" rel="noopener noreferrer" className="cv-botao cv-botao-icone"><CalendarDays className="w-4 h-4" />Adicionar ao Google Agenda</a>}
                <button type="button" className="cv-rsvp-voltar" onClick={aoFechar}>Voltar ao convite</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
