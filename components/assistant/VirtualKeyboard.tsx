'use client';

// ============================================================
// VirtualKeyboard.tsx
// Caminho: components/assistant/VirtualKeyboard.tsx
//
// Teclado virtual para modo kiosk — sem acesso a configurações,
// teclas de sistema ou atalhos especiais.
//
// Suporta: letras (a-z), números (0-9), acentos do PT-BR,
// espaço, backspace e enter.
// ============================================================

import { useState } from 'react';

interface VirtualKeyboardProps {
  onKey: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  onClose?: () => void;
  onReplace?: (char: string) => void; // ✅ NOVO: substitui o último caractere digitado
  theme?: 'dark' | 'light';
}

// ── Layouts ───────────────────────────────────────────────

const ROWS_LOWER = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const ROWS_UPPER = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

// Acentos PT-BR agrupados por vogal base
const ACCENTS: Record<string, string[]> = {
  a: ['á', 'à', 'â', 'ã', 'ä'],
  e: ['é', 'è', 'ê', 'ë'],
  i: ['í', 'ì', 'î', 'ï'],
  o: ['ó', 'ò', 'ô', 'õ', 'ö'],
  u: ['ú', 'ù', 'û', 'ü'],
  c: ['ç'],
  A: ['Á', 'À', 'Â', 'Ã', 'Ä'],
  E: ['É', 'È', 'Ê', 'Ë'],
  I: ['Í', 'Ì', 'Î', 'Ï'],
  O: ['Ó', 'Ò', 'Ô', 'Õ', 'Ö'],
  U: ['Ú', 'Ù', 'Û', 'Ü'],
  C: ['Ç'],
};

const ACCENTABLE = new Set([...Object.keys(ACCENTS)]);

export default function VirtualKeyboard({
  onKey,
  onBackspace,
  onEnter,
  onClose,
  onReplace,
  theme = 'dark',
}: VirtualKeyboardProps) {
  const [shift, setShift] = useState(false);
  const [numbers, setNumbers] = useState(false);
  // ✅ ALTERADO: accentMenu agora só guarda qual tecla está "ativa" (para highlight)
  // A letra já foi enviada no primeiro clique
  const [accentActiveKey, setAccentActiveKey] = useState<{ key: string; options: string[] } | null>(null);

  const isDark = theme === 'dark';

  // ✅ Handler para fechar o teclado
  const handleClose = () => {
    onClose?.();
    window.dispatchEvent(new CustomEvent('eai:virtualKeyboardClose'));
  };

  // ── Cores ─────────────────────────────────────────────────
  const bg        = isDark ? '#1e293b' : '#f1f5f9';
  const keyBg     = isDark ? '#334155' : '#ffffff';
  const keyText   = isDark ? '#f8fafc'  : '#0f172a';
  const specialBg = isDark ? '#0f172a' : '#cbd5e1';
  const accentBg  = isDark ? '#1d4ed8' : '#3b82f6';
  const enterBg   = isDark ? '#16a34a' : '#22c55e';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

  // ── Handlers ──────────────────────────────────────────────

  const handleKey = (key: string) => {
    setAccentActiveKey(null);
    onKey(key);
    if (shift) setShift(false);
  };

  const handleKeyPress = (key: string) => {
    const base = key;
    if (ACCENTABLE.has(base)) {
      // ✅ FIX: Primeiro clique ENVIA a letra imediatamente
      onKey(key);
      if (shift) setShift(false);

      if (accentActiveKey?.key === base) {
        // Segunda vez na mesma tecla = fecha o menu de acentos (letra já foi enviada)
        setAccentActiveKey(null);
      } else {
        // Abre o menu de acentos para eventual substituição
        setAccentActiveKey({ key: base, options: ACCENTS[base] });
      }
    } else {
      handleKey(key);
    }
  };

  const handleAccent = (char: string) => {
    // ✅ FIX: Substitui a última letra digitada pelo acento escolhido
    if (onReplace) {
      onReplace(char); // usa callback de substituição se disponível
    } else {
      // Fallback: apaga a letra anterior e digita o acento
      onBackspace();
      onKey(char);
    }
    setAccentActiveKey(null);
    if (shift) setShift(false);
  };

  const rows = shift ? ROWS_UPPER : ROWS_LOWER;

  // ── Estilos de tecla ──────────────────────────────────────
  const keyStyle = (active = false): React.CSSProperties => ({
    background: active ? accentBg : keyBg,
    color: active ? '#fff' : keyText,
    border: `1px solid ${borderColor}`,
    borderRadius: 8,
    padding: '10px 0',
    minWidth: 36,
    flex: 1,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transition: 'background 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  });

  const specialKeyStyle = (wide = false): React.CSSProperties => ({
    ...keyStyle(),
    background: specialBg,
    fontSize: 13,
    fontWeight: 600,
    flex: wide ? 2 : 1.4,
    minWidth: wide ? 72 : 48,
  });

  return (
    <div
      data-virtual-keyboard
      style={{
        background: bg,
        borderTop: `1px solid ${borderColor}`,
        padding: '10px 8px 12px',
        // ✅ FIX: garante largura total independente do tema
        width: '100%',
        boxSizing: 'border-box',
        // ✅ FIX: remove qualquer posicionamento relativo que causava
        //         o teclado "pequeno" no dark; o pai é quem posiciona
        position: 'static',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // ✅ FIX: evita que o conteúdo transborde no dark mode
        overflow: 'hidden',
      }}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
    >
      {/* ✅ Botão X para fechar o teclado */}
      <button
        type="button"
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          border: 'none',
          color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
          fontSize: 20,
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        }}
      >
        ✕
      </button>

      {/* ── Popup de acentos ──────────────────────────────── */}
      {/* ✅ FIX: agora aparece ACIMA do teclado como sugestão de substituição */}
      {accentActiveKey && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          marginBottom: 8,
        }}>
          {/* Label informativo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
            fontSize: 11,
            paddingRight: 4,
          }}>
            substituir:
          </div>

          {/* Variantes acentuadas */}
          {accentActiveKey.options.map((a) => (
            <button
              key={a}
              type="button"
              style={{ ...keyStyle(true), flex: 'none', width: 44 }}
              onMouseDown={(e) => { e.preventDefault(); handleAccent(a); }}
              onTouchEnd={(e) => { e.preventDefault(); handleAccent(a); }}
            >
              {a}
            </button>
          ))}

          {/* Fechar popup */}
          <button
            type="button"
            style={{ ...keyStyle(), flex: 'none', width: 44, background: specialBg, fontSize: 11 }}
            onMouseDown={(e) => { e.preventDefault(); setAccentActiveKey(null); }}
            onTouchEnd={(e) => { e.preventDefault(); setAccentActiveKey(null); }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Números ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
        {numbers ? (
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
              {NUMBERS.slice(0, 5).map((n) => (
                <button key={n} type="button" style={keyStyle()}
                  onMouseDown={(e) => { e.preventDefault(); handleKey(n); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleKey(n); }}
                >{n}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {NUMBERS.slice(5).map((n) => (
                <button key={n} type="button" style={keyStyle()}
                  onMouseDown={(e) => { e.preventDefault(); handleKey(n); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleKey(n); }}
                >{n}</button>
              ))}
            </div>
          </div>
        ) : (
          NUMBERS.map((n) => (
            <button key={n} type="button" style={keyStyle()}
              onMouseDown={(e) => { e.preventDefault(); handleKey(n); }}
              onTouchEnd={(e) => { e.preventDefault(); handleKey(n); }}
            >{n}</button>
          ))
        )}
      </div>

      {/* ── Letras ────────────────────────────────────────── */}
      {!numbers && rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 6 }}>
          {ri > 0 && <div style={{ width: ri === 1 ? 18 : 54 }} />}

          {row.map((key) => (
            <button
              key={key}
              type="button"
              // ✅ FIX: highlight quando a tecla está como "acent ativa" (já enviada, aguardando substituição)
              style={keyStyle(accentActiveKey?.key === key)}
              onMouseDown={(e) => { e.preventDefault(); handleKeyPress(key); }}
              onTouchEnd={(e) => { e.preventDefault(); handleKeyPress(key); }}
            >
              {key}
            </button>
          ))}

          {ri > 0 && <div style={{ width: ri === 1 ? 18 : 54 }} />}
        </div>
      ))}

      {/* ── Linha de controles ────────────────────────────── */}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>

        {/* Shift */}
        <button
          type="button"
          style={specialKeyStyle()}
          onMouseDown={(e) => { e.preventDefault(); setShift(!shift); setAccentActiveKey(null); }}
          onTouchEnd={(e) => { e.preventDefault(); setShift(!shift); setAccentActiveKey(null); }}
        >
          {shift ? '⬆ ON' : '⬆'}
        </button>

        {/* 123 / ABC */}
        <button
          type="button"
          style={specialKeyStyle()}
          onMouseDown={(e) => { e.preventDefault(); setNumbers(!numbers); setAccentActiveKey(null); }}
          onTouchEnd={(e) => { e.preventDefault(); setNumbers(!numbers); setAccentActiveKey(null); }}
        >
          {numbers ? 'ABC' : '123'}
        </button>

        {/* Espaço */}
        <button
          type="button"
          style={{ ...keyStyle(), flex: 4, fontSize: 13, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}
          onMouseDown={(e) => { e.preventDefault(); handleKey(' '); }}
          onTouchEnd={(e) => { e.preventDefault(); handleKey(' '); }}
        >
          espaço
        </button>

        {/* Backspace */}
        <button
          type="button"
          style={specialKeyStyle()}
          onMouseDown={(e) => { e.preventDefault(); onBackspace(); setAccentActiveKey(null); }}
          onTouchEnd={(e) => { e.preventDefault(); onBackspace(); setAccentActiveKey(null); }}
        >
          ⌫
        </button>

        {/* Enter */}
        <button
          type="button"
          style={{ ...specialKeyStyle(true), background: enterBg, color: '#fff' }}
          onMouseDown={(e) => { e.preventDefault(); onEnter(); setAccentActiveKey(null); }}
          onTouchEnd={(e) => { e.preventDefault(); onEnter(); setAccentActiveKey(null); }}
        >
          ↵ Enviar
        </button>
      </div>
    </div>
  );
}
