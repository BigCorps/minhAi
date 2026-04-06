'use client';

// ============================================================
// components/cliente/dashboards/shared/CardMinhaConta.tsx
//
// Exibe dados do perfil logado.
// Botão de lápis (Pencil) abre ModalEditarPerfil.
// Após salvar, atualiza o estado local sem refresh de página.
//
// Campos editáveis por tipo (gerenciados no ModalEditarPerfil):
//   totem        → Nome
//   colaboradores → Nome + Telefone
//   cliente       → Nome + Telefone + Endereço
//
// Campos somente leitura (sempre):
//   E-mail, Identificador (só via dashboard do dono)
// ============================================================

import { useState } from 'react';
import { User, Pencil } from 'lucide-react';
import { SlugProfile } from '@/hooks/useProfile';
import ModalEditarPerfil from './ModalEditarPerfil';

const TIPO_LABEL: Record<string, string> = {
  cliente: 'Cliente', colaborador: 'Colaborador', frentista: 'Frentista',
  atendente: 'Atendente', caixa: 'Caixa', gerente: 'Gerente',
  administrador: 'Administrador', totem: 'Totem',
};

const TIPO_COLOR: Record<string, { bg: string; text: string }> = {
  cliente:       { bg: 'rgba(236,72,153,0.12)',  text: '#ec4899' },
  colaborador:   { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8' },
  frentista:     { bg: 'rgba(249,115,22,0.12)',  text: '#f97316' },
  atendente:     { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6' },
  caixa:         { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
  gerente:       { bg: 'rgba(168,85,247,0.12)',  text: '#a855f7' },
  administrador: { bg: 'rgba(168,85,247,0.12)',  text: '#a855f7' },
  totem:         { bg: 'rgba(6,182,212,0.12)',   text: '#06b6d4' },
};

interface CardMinhaContaProps {
  profile: SlugProfile;
  slug: string;
  theme: 'dark' | 'light';
  /** Modo horizontal: full-width no topo do dashboard (desktop) */
  horizontal?: boolean;
}

export default function CardMinhaConta({
  profile, slug, theme, horizontal = false,
}: CardMinhaContaProps) {
  const isDark    = theme === 'dark';
  const tipoColor = TIPO_COLOR[profile.tipo] ?? TIPO_COLOR.colaborador;
  const tipoLabel = TIPO_LABEL[profile.tipo]  ?? profile.tipo;

  // Estado local — atualiza imediatamente após salvar sem refresh
  const [localNome,     setLocalNome]     = useState(profile.nome);
  const [localTelefone, setLocalTelefone] = useState(profile.metadata?.telefone ?? '');
  const [localEndereco, setLocalEndereco] = useState(profile.endereco ?? '');
  const [showModal,     setShowModal]     = useState(false);

  function handleSalvo(updated: any) {
    if (updated.nome     !== undefined) setLocalNome(updated.nome);
    if (updated.endereco !== undefined) setLocalEndereco(updated.endereco ?? '');
    if (updated.metadata?.telefone !== undefined) setLocalTelefone(updated.metadata.telefone ?? '');
  }

  // ── Cores ─────────────────────────────────────────────────
  const cardBg     = isDark ? 'rgba(30,41,59,0.8)'    : 'rgba(255,255,255,0.9)';
  const cardBorder = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.5)';
  const labelColor = isDark ? 'rgb(100,116,139)'       : 'rgb(148,163,184)';
  const valueColor = isDark ? 'rgb(226,232,240)'       : 'rgb(15,23,42)';
  const titleColor = isDark ? 'rgb(241,245,249)'       : 'rgb(15,23,42)';
  const pencilColor= isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.5)';
  const pencilHover= isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)';

  // ── Botão lápis ───────────────────────────────────────────
  const EditButton = () => (
    <button
      onClick={() => setShowModal(true)}
      title="Editar informações"
      className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95"
      style={{
        background: pencilHover,
        color: pencilColor,
        border: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.15)'}`,
      }}
    >
      <Pencil className="w-3.5 h-3.5" />
    </button>
  );

  // ── Layout horizontal ─────────────────────────────────────
  if (horizontal) {
    return (
      <>
        <div
          className="rounded-2xl px-6 py-4 shadow-lg border w-full"
          style={{ background: cardBg, borderColor: cardBorder }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            {/* Ícone */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(168,85,247,0.1)' }}>
              <User className="w-5 h-5" style={{ color: isDark ? 'rgb(216,180,254)' : 'rgb(107,33,168)' }} />
            </div>

            {/* Nome + badge */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="font-bold text-lg" style={{ color: titleColor }}>
                {localNome}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: tipoColor.bg, color: tipoColor.text }}>
                {tipoLabel}
              </span>
            </div>

            {/* Divisor */}
            <div className="hidden sm:block w-px h-8 self-center"
              style={{ background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(203,213,225,0.6)' }} />

            {/* Campos em linha */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 flex-1 min-w-0">
              {profile.email && (
                <Field label="E-mail" value={profile.email} labelColor={labelColor} valueColor={valueColor} />
              )}
              {profile.identificador && profile.identificador !== profile.email && (
                <Field label="ID" value={profile.identificador} labelColor={labelColor} valueColor={valueColor} />
              )}
              {localTelefone && (
                <Field label="Telefone" value={localTelefone} labelColor={labelColor} valueColor={valueColor} />
              )}
              {localEndereco && (
                <Field label="Endereço" value={localEndereco} labelColor={labelColor} valueColor={valueColor} />
              )}
            </div>

            {/* Lápis */}
            <EditButton />
          </div>
        </div>

        {showModal && (
          <ModalEditarPerfil
            profile={{ ...profile, nome: localNome, endereco: localEndereco, metadata: { ...profile.metadata, telefone: localTelefone } }}
            slug={slug}
            theme={theme}
            onClose={() => setShowModal(false)}
            onSalvo={handleSalvo}
          />
        )}
      </>
    );
  }

  // ── Layout vertical ───────────────────────────────────────
  return (
    <>
      <div className="rounded-2xl p-6 shadow-lg border"
        style={{ background: cardBg, borderColor: cardBorder }}>

        {/* Header: ícone + título + lápis */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(168,85,247,0.1)' }}>
              <User className="w-6 h-6" style={{ color: isDark ? 'rgb(216,180,254)' : 'rgb(107,33,168)' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: titleColor }}>Minha Conta</h2>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: tipoColor.bg, color: tipoColor.text }}>
                {tipoLabel}
              </span>
            </div>
          </div>
          <EditButton />
        </div>

        <div className="space-y-4">
          <Field label="Nome" value={localNome} labelColor={labelColor} valueColor={valueColor} />
          {profile.email && (
            <Field label="E-mail" value={profile.email} labelColor={labelColor} valueColor={valueColor} small />
          )}
          {profile.identificador && profile.identificador !== profile.email && (
            <Field label="Identificador" value={profile.identificador} labelColor={labelColor} valueColor={valueColor} />
          )}
          {localTelefone && (
            <Field label="Telefone" value={localTelefone} labelColor={labelColor} valueColor={valueColor} />
          )}
          {localEndereco && (
            <Field label="Endereço" value={localEndereco} labelColor={labelColor} valueColor={valueColor} />
          )}
        </div>
      </div>

      {showModal && (
        <ModalEditarPerfil
          profile={{ ...profile, nome: localNome, endereco: localEndereco, metadata: { ...profile.metadata, telefone: localTelefone } }}
          slug={slug}
          theme={theme}
          onClose={() => setShowModal(false)}
          onSalvo={handleSalvo}
        />
      )}
    </>
  );
}

// ── Sub-componente: campo somente leitura ─────────────────────

function Field({ label, value, labelColor, valueColor, small }: {
  label: string; value: string;
  labelColor: string; valueColor: string;
  small?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5 uppercase tracking-wide" style={{ color: labelColor }}>
        {label}
      </p>
      <p className={`font-semibold break-all leading-tight ${small ? 'text-sm' : ''}`} style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  );
}
