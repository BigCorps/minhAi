'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CheckCircle2, Loader2, MailCheck, Plus, Search, Trash2, X } from 'lucide-react';
import { tokensDoConvite } from '@/lib/conviteria/tokens';

type EmailStatus = 'enviado' | 'sem_google' | 'falhou' | null;
type PessoaRestrita = { id: string; nome: string; tipo: 'adulto' | 'crianca'; status: string };

export default function ModalRSVP({ eventoId, temaId, fonteId, aoFechar }: { eventoId: string; temaId: string; fonteId: string; aoFechar: () => void; }) {
  const [montado, setMontado] = useState(false);
  const [restrito, setRestrito] = useState<boolean | null>(null);
  const [nome, setNome] = useState(''); const [email, setEmail] = useState(''); const [familia, setFamilia] = useState<string[]>([]);
  const [contato, setContato] = useState(''); const [grupoTitulo, setGrupoTitulo] = useState(''); const [pessoas, setPessoas] = useState<PessoaRestrita[]>([]); const [selecionados, setSelecionados] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false); const [erro, setErro] = useState(''); const [confirmado, setConfirmado] = useState<number | null>(null); const [atualizado, setAtualizado] = useState(false); const [agendaUrl, setAgendaUrl] = useState<string | null>(null); const [emailStatus, setEmailStatus] = useState<EmailStatus>(null);
  const solicitacaoId = useRef<string | null>(null);

  useEffect(() => {
    setMontado(true); const antes = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); }; document.addEventListener('keydown', tecla);
    fetch(`/api/conviteria/rsvp?eventoId=${encodeURIComponent(eventoId)}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => setRestrito(!!d?.restrito)).catch(() => setRestrito(false));
    return () => { document.body.style.overflow = antes; document.removeEventListener('keydown', tecla); };
  }, [aoFechar, eventoId]);

  if (!montado) return null;
  function adicionar() { if (familia.length < 20) setFamilia((f) => [...f, '']); }
  function alterar(i: number, valor: string) { setFamilia((f) => f.map((v, idx) => idx === i ? valor : v)); }
  function remover(i: number) { setFamilia((f) => f.filter((_, idx) => idx !== i)); }

  async function buscarRestrito() {
    setErro(''); setEnviando(true);
    try {
      const r = await fetch('/api/conviteria/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventoId, acao: 'buscar_restrito', contato }) });
      const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.erro || 'Não encontramos este contato.');
      setGrupoTitulo(d.grupo?.titulo ?? 'Convidados'); setPessoas(d.grupo?.pessoas ?? []);
      setSelecionados((d.grupo?.pessoas ?? []).filter((p: PessoaRestrita) => p.status !== 'nao_vai').map((p: PessoaRestrita) => p.id));
    } catch (e: any) { setErro(e.message || 'Não encontramos este contato.'); }
    finally { setEnviando(false); }
  }

  async function confirmar() {
    setErro('');
    if (restrito) {
      if (!pessoas.length) return setErro('Primeiro localize seu convite pelo contato cadastrado.');
      if (!selecionados.length) return setErro('Selecione ao menos uma pessoa que irá ao evento.');
    } else {
      if (nome.trim().length < 2) return setErro('Informe seu nome.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro('Informe um e-mail válido.');
    }
    setEnviando(true); const id = solicitacaoId.current ?? crypto.randomUUID(); solicitacaoId.current = id;
    try {
      const payload = restrito
        ? { eventoId, acao: 'confirmar_restrito', contato, convidadoIds: selecionados, solicitacaoId: id }
        : { eventoId, nome: nome.trim(), email: email.trim(), acompanhantes: familia.map((x) => x.trim()).filter(Boolean), solicitacaoId: id };
      const r = await fetch('/api/conviteria/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.erro || 'Não foi possível confirmar.');
      setConfirmado(Number(d.totalPessoas ?? 1)); setAtualizado(Boolean(d.atualizado)); setAgendaUrl(typeof d.agendaUrl === 'string' ? d.agendaUrl : null);
      setEmailStatus(['enviado','sem_google','falhou'].includes(d.emailStatus) ? d.emailStatus : null); solicitacaoId.current = null;
    } catch (e: any) { setErro(e.message || 'Não foi possível confirmar sua presença.'); }
    finally { setEnviando(false); }
  }

  return createPortal(
    <div className="cv-modal-fundo" style={tokensDoConvite(temaId, fonteId)} role="dialog" aria-modal="true" aria-label="Confirmação de presença" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="cv-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="cv-modal-topo"><h2>Confirmar presença</h2><button type="button" onClick={aoFechar} aria-label="Fechar"><X className="w-5 h-5" /></button></header>
        <div className="cv-modal-corpo">
          {restrito == null ? <div className="cv-modal-centro"><Loader2 className="w-7 h-7 animate-spin" /><p>Carregando…</p></div> : confirmado == null ? (
            <div className="cv-modal-form">
              {restrito ? (
                <>
                  <p className="cv-rsvp-intro">Este evento usa lista de convidados. Informe o e-mail ou telefone cadastrado para localizar sua família.</p>
                  <label>E-mail ou telefone<input type="text" maxLength={180} placeholder="voce@email.com ou telefone" value={contato} onChange={(e) => { setContato(e.target.value); setPessoas([]); }} /></label>
                  <button type="button" className="cv-botao cv-botao-icone" disabled={enviando || contato.trim().length < 5} onClick={buscarRestrito}>{enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Localizar convite</button>
                  {pessoas.length > 0 && <div className="cv-rsvp-familia"><div className="cv-rsvp-familia-topo"><div><strong>{grupoTitulo}</strong><small>Marque quem irá ao evento.</small></div></div><div className="cv-rsvp-pessoas">{pessoas.map((p) => <label key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10 }}><input type="checkbox" checked={selecionados.includes(p.id)} onChange={(e) => setSelecionados((s) => e.target.checked ? [...s, p.id] : s.filter((id) => id !== p.id))} /><span>{p.nome}{p.tipo === 'crianca' ? ' · criança' : ''}</span></label>)}</div></div>}
                </>
              ) : (
                <>
                  <p className="cv-rsvp-intro">Informe quem irá ao evento. Se precisar corrigir depois, envie novamente usando o mesmo e-mail.</p>
                  <label>Seu nome<input type="text" maxLength={120} autoComplete="name" placeholder="Ex.: Ana Silva" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
                  <label>Seu e-mail<input type="email" maxLength={180} autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
                  <div className="cv-rsvp-familia"><div className="cv-rsvp-familia-topo"><div><strong>Pessoas da sua família que também irão</strong><small>Não repita seu próprio nome.</small></div><button type="button" onClick={adicionar} disabled={familia.length >= 20}><Plus className="w-4 h-4" />Adicionar</button></div>{familia.length === 0 && <p className="cv-rsvp-sozinho">Se for somente você, pode confirmar assim mesmo.</p>}<div className="cv-rsvp-pessoas">{familia.map((pessoa, i) => <div className="cv-rsvp-pessoa" key={i}><input type="text" maxLength={120} placeholder={`Pessoa ${i + 2}`} value={pessoa} onChange={(e) => alterar(i, e.target.value)} /><button type="button" onClick={() => remover(i)} aria-label="Remover pessoa"><Trash2 className="w-4 h-4" /></button></div>)}</div></div>
                </>
              )}
              {erro && <p className="cv-modal-erro">{erro}</p>}
              {(!restrito || pessoas.length > 0) && <button type="button" className="cv-botao cv-botao-icone" disabled={enviando} onClick={confirmar}>{enviando && <Loader2 className="w-4 h-4 animate-spin" />}{enviando ? 'Confirmando…' : 'Confirmar presença'}</button>}
              <p className="cv-rsvp-privacidade">Os dados são usados pelos anfitriões somente para a organização deste evento.</p>
            </div>
          ) : (
            <div className="cv-modal-centro"><CheckCircle2 className="w-12 h-12" /><p className="cv-modal-valor">{atualizado ? 'Confirmação atualizada!' : 'Presença confirmada!'}</p><p className="cv-modal-dica">{confirmado === 1 ? 'Confirmamos a presença de 1 pessoa.' : `Confirmamos a presença de ${confirmado} pessoas.`}</p>{emailStatus === 'enviado' && <p className="cv-rsvp-email-ok"><MailCheck className="w-4 h-4" />Enviamos a confirmação por e-mail.</p>}<div className="cv-rsvp-acoes-sucesso">{agendaUrl && <a href={agendaUrl} target="_blank" rel="noopener noreferrer" className="cv-botao cv-botao-icone"><CalendarDays className="w-4 h-4" />Adicionar ao Google Agenda</a>}<button type="button" className="cv-rsvp-voltar" onClick={aoFechar}>Voltar ao convite</button></div></div>
          )}
        </div>
      </div>
    </div>, document.body
  );
}
