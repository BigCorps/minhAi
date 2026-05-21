(function() {
  // ── Leitura dos data-attributes ──────────────────────────────────────────
  const script      = document.currentScript;
  const slug        = script.dataset.slug;
  const cor         = script.dataset.cor         || '#3b82f6';
  const texto       = script.dataset.texto       || '💬 Assistente';
  const posicao     = script.dataset.posicao     || 'right';   // 'left' | 'right'
  const popupSize   = script.dataset.popupSize   || 'medium';  // 'small' | 'medium' | 'large'
  const buttonSize  = script.dataset.buttonSize  || 'medium';  // 'small' | 'medium' | 'large'

  if (!slug) {
    console.error('minhAi Widget: data-slug é obrigatório.');
    return;
  }

  // ── Dimensões do popup ───────────────────────────────────────────────────
  const popupSizes = {
    small:  { width: 320, height: 560 },
    medium: { width: 420, height: 720 },
    large:  { width: 520, height: 860 },
  };
  const { width: popupWidth, height: popupHeight } = popupSizes[popupSize] || popupSizes.medium;

  // ── Estilos do botão por tamanho ─────────────────────────────────────────
  const buttonStyles = {
    small:  { padding: '10px 18px', fontSize: '13px' },
    medium: { padding: '14px 24px', fontSize: '15px' },
    large:  { padding: '18px 32px', fontSize: '17px' },
  };
  const { padding: btnPadding, fontSize: btnFontSize } = buttonStyles[buttonSize] || buttonStyles.medium;

  // ── Cria o botão flutuante ───────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'minhai-widget-button';
  btn.innerHTML = `
    <span style="margin-right: 8px;">${texto}</span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  `;

  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    ${posicao}: 24px;
    z-index: 2147483647;
    background: ${cor};
    color: white;
    border: none;
    border-radius: 50px;
    padding: ${btnPadding};
    font-size: ${btnFontSize};
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 24px rgba(0,0,0,0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
    -webkit-font-smoothing: antialiased;
  `;

  // ── Hover ────────────────────────────────────────────────────────────────
  btn.onmouseover = () => {
    btn.style.transform = 'translateY(-4px)';
    btn.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)';
  };
  btn.onmouseout = () => {
    btn.style.transform = 'translateY(0)';
    btn.style.boxShadow = '0 6px 24px rgba(0,0,0,0.15)';
  };

  // ── Abertura do popup ────────────────────────────────────────────────────
  btn.onclick = () => {
    const screenW = window.screen.width;
    const screenH = window.screen.height;

    // Posição vertical: centralizado na tela
    const top = Math.round((screenH - popupHeight) / 2);

    // Posição horizontal: alinha pelo mesmo lado do botão
    let left;
    if (posicao === 'left') {
      // Popup parte da borda esquerda com 24px de margem
      left = 24;
    } else {
      // Popup fica encostado na borda direita com 24px de margem
      left = screenW - popupWidth - 24;
    }

    const popup = window.open(
      `https://minhai.app/ia/${slug}/widget`,
      'minhAiWidget',
      [
        `width=${popupWidth}`,
        `height=${popupHeight}`,
        `top=${top}`,
        `left=${left}`,
        'status=no',
        'menubar=no',
        'toolbar=no',
        'location=no',
        'resizable=yes',
      ].join(',')
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert('Por favor, permita popups para falar com o assistente.');
    } else {
      popup.focus();
    }
  };

  // ── Injeta no body ───────────────────────────────────────────────────────
  if (document.body) {
    document.body.appendChild(btn);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(btn);
    });
  }
})();
