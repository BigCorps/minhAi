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
  onClose?: () => void;  // ✅ NOVO: Chamado quando clicar no X
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
  onClose,  // ✅ NOVO
  theme = 'dark',
}: VirtualKeyboardProps) {
  const [shift, setShift] = useState(false);
  const [numbers, setNumbers] = useState(false);
  const [accentMenu, setAccentMenu] = useState<{ key: string; options: string[] } | null>(null);

  const isDark = theme === 'dark';

  // ✅ Handler para fechar o teclado
  const handleClose = () => {
    onClose?.();  // Chama handler do pai PRIMEIRO
    window.dispatchEvent(new CustomEvent('eai:virtualKeyboardClose'));  // Depois dispara evento
  };

  // ── Cores ─────────────────────────────────────────────────
  const bg       = isDark ? '#1e293b' : '#f1f5f9';
  const keyBg    = isDark ? '#334155' : '#ffffff';
  const keyHover = isDark ? '#475569' : '#e2e8f0';
  const keyText  = isDark ? '#f8fafc'  : '#0f172a';
  const specialBg = isDark ? '#0f172a' : '#cbd5e1';
  const accentBg  = isDark ? '#1d4ed8' : '#3b82f6';
  const enterBg   = isDark ? '#16a34a' : '#22c55e';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

  // ── Handlers ──────────────────────────────────────────────
  const handleKey = (key: string) => {
    setAccentMenu(null);
    onKey(key);
    if (shift) setShift(false); // auto-desativa shift após tecla
  };

  const handleKeyPress = (key: string) => {
    // Verificar se é acentuável — toque longo seria ideal mas no kiosk
    // usamos toque simples: se a tecla tem acentos, mostra popup pequeno
    const base = key;
    if (ACCENTABLE.has(base)) {
      if (accentMenu?.key === base) {
        // Segunda vez na mesma tecla = digita a letra normal
        setAccentMenu(null);
        handleKey(key);
      } else {
        setAccentMenu({ key: base, options: ACCENTS[base] });
      }
    } else {
      handleKey(key);
    }
  };

  const handleAccent = (char: string) => {
    setAccentMenu(null);
    onKey(char);
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
      data-virtual-keyboard  /* ✅ Marca este componente para exceção no KioskWrapper */
      style={{
        background: bg,
        borderTop: `1px solid ${borderColor}`,
        padding: '10px 8px 12px',
        width: '100%',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        position: 'relative', // ✅ Para posicionar o botão X
      }}
      // Impede que o teclado virtual feche o teclado nativo
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
    >
      {/* ✅ NOVO: Botão X para fechar o teclado */}
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
      {accentMenu && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          marginBottom: 8,
        }}>
          {/* Letra base */}
          <button
            type="button"
            style={{ ...keyStyle(), flex: 'none', width: 44, background: keyBg, fontWeight: 700 }}
            onMouseDown={(e) => { e.preventDefault(); handleKey(accentMenu.key); }}
            onTouchEnd={(e) => { e.preventDefault(); handleKey(accentMenu.key); }}
          >
            {accentMenu.key}
          </button>
          {/* Variantes acentuadas */}
          {accentMenu.options.map((a) => (
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
          {/* Cancelar */}
          <button
            type="button"
            style={{ ...keyStyle(), flex: 'none', width: 44, background: specialBg, fontSize: 11 }}
            onMouseDown={(e) => { e.preventDefault(); setAccentMenu(null); }}
            onTouchEnd={(e) => { e.preventDefault(); setAccentMenu(null); }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Números ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
        {numbers ? (
          // Modo numérico expandido: 2 linhas de 5
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
          // Linha de números compacta (sempre visível)
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
          {/* Indentação visual das linhas 2 e 3 */}
          {ri > 0 && <div style={{ width: ri === 1 ? 18 : 54 }} />}

          {row.map((key) => (
            <button
              key={key}
              type="button"
              style={keyStyle(accentMenu?.key === key)}
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
          onMouseDown={(e) => { e.preventDefault(); setShift(!shift); setAccentMenu(null); }}
          onTouchEnd={(e) => { e.preventDefault(); setShift(!shift); setAccentMenu(null); }}
        >
          {shift ? '⬆ ON' : '⬆'}
        </button>

        {/* 123 / ABC */}
        <button
          type="button"
          style={specialKeyStyle()}
          onMouseDown={(e) => { e.preventDefault(); setNumbers(!numbers); setAccentMenu(null); }}
          onTouchEnd={(e) => { e.preventDefault(); setNumbers(!numbers); setAccentMenu(null); }}
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
          onMouseDown={(e) => { e.preventDefault(); onBackspace(); setAccentMenu(null); }}
          onTouchEnd={(e) => { e.preventDefault(); onBackspace(); setAccentMenu(null); }}
        >
          ⌫
        </button>

        {/* Enter */}
        <button
          type="button"
          style={{ ...specialKeyStyle(true), background: enterBg, color: '#fff' }}
          onMouseDown={(e) => { e.preventDefault(); onEnter(); setAccentMenu(null); }}
          onTouchEnd={(e) => { e.preventDefault(); onEnter(); setAccentMenu(null); }}
        >
          ↵ Enviar
        </button>
      </div>
    </div>
  );
}
