(function() {
  // ── Leitura dos data-attributes ──────────────────────────────────────────
  // document.currentScript é null quando carregado dinamicamente (React, Vue, etc.)
  // Fallback: busca a tag pelo src para garantir compatibilidade universal
  const script =
    document.currentScript ||
    document.querySelector('script[src*="minhai.app/widget.js"]');

  if (!script) {
    console.error('minhAi Widget: não foi possível localizar o script no DOM.');
    return;
  }

  const slug       = script.dataset.slug;
  const cor        = script.dataset.cor        || '#3b82f6';
  const texto      = script.dataset.texto      || '💬 Assistente';
  const posicao    = script.dataset.posicao    || 'right';
  const popupSize  = script.dataset.popupSize  || 'medium';
  const buttonSize = script.dataset.buttonSize || 'medium';

  if (!slug) {
    console.error('minhAi Widget: data-slug é obrigatório.');
    return;
  }

  // ── Evita duplicação (React StrictMode, hot reload, múltiplas injeções) ──
  if (document.getElementById('minhai-widget-button')) return;

  // ── Dimensões do card inline ─────────────────────────────────────────────
  const cardSizes = {
    small:  { width: '320px', height: '560px' },
    medium: { width: '420px', height: '720px' },
    large:  { width: '520px', height: '860px' },
  };
  const { width: cardWidth, height: cardHeight } =
    cardSizes[popupSize] || cardSizes.medium;

  // ── Estilos do botão por tamanho ─────────────────────────────────────────
  const buttonStyles = {
    small:  { padding: '10px 18px', fontSize: '13px' },
    medium: { padding: '14px 24px', fontSize: '15px' },
    large:  { padding: '18px 32px', fontSize: '17px' },
  };
  const { padding: btnPadding, fontSize: btnFontSize } =
    buttonStyles[buttonSize] || buttonStyles.medium;

  // ── Estado ───────────────────────────────────────────────────────────────
  let isOpen = false;
  let card = null;

  // ── Cria o ícone SVG como referência direta (closure) ────────────────────
  // Evita getElementById frágil após re-renders ou múltiplas aberturas
  const iconSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconSVG.setAttribute('width', '16');
  iconSVG.setAttribute('height', '16');
  iconSVG.setAttribute('viewBox', '0 0 24 24');
  iconSVG.setAttribute('fill', 'none');
  iconSVG.setAttribute('stroke', 'currentColor');
  iconSVG.setAttribute('stroke-width', '2.5');
  iconSVG.setAttribute('stroke-linecap', 'round');
  iconSVG.setAttribute('stroke-linejoin', 'round');

  const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  iconPath.setAttribute('d', 'm6 9 6 6 6-6');
  iconSVG.appendChild(iconPath);

  // ── Cria o botão flutuante ───────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'minhai-widget-button';

  const labelSpan = document.createElement('span');
  labelSpan.style.marginRight = '8px';
  labelSpan.textContent = texto;

  btn.appendChild(labelSpan);
  btn.appendChild(iconSVG);

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

  // ── Cria o card inline com iframe ────────────────────────────────────────
  function createCard() {
    const wrapper = document.createElement('div');
    wrapper.id = 'minhai-widget-card';

    wrapper.style.cssText = `
      position: fixed;
      bottom: 90px;
      ${posicao}: 24px;
      width: ${cardWidth};
      height: ${cardHeight};
      z-index: 2147483646;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 16px 64px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1);
      opacity: 0;
      transform: translateY(16px) scale(0.97);
      transition: opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1);
      pointer-events: none;
      isolation: isolate;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = `https://minhai.app/ia/${slug}/widget`;
    iframe.scrolling = 'no';
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      overflow: hidden;
    `;
    iframe.allow = 'clipboard-write';
    iframe.setAttribute('sandbox', [
      'allow-scripts',
      'allow-same-origin',
      'allow-forms',
      'allow-popups',
    ].join(' '));

    wrapper.addEventListener('wheel',     (e) => e.stopPropagation(), { passive: false });
    wrapper.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });

    wrapper.appendChild(iframe);
    return wrapper;
  }

  // ── Abrir card ───────────────────────────────────────────────────────────
  function openCard() {
    card = createCard();
    document.body.appendChild(card);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
        card.style.pointerEvents = 'auto';
      });
    });

    // Manipula o ícone via referência direta (closure) — sem getElementById
    iconPath.setAttribute('d', 'M18 6 6 18 M6 6 l12 12');
    isOpen = true;
  }

  // ── Fechar card ──────────────────────────────────────────────────────────
  function closeCard() {
    if (!card) return;

    card.style.opacity = '0';
    card.style.transform = 'translateY(16px) scale(0.97)';
    card.style.pointerEvents = 'none';

    setTimeout(() => {
      if (card && card.parentNode) card.parentNode.removeChild(card);
      card = null;
    }, 250);

    iconPath.setAttribute('d', 'm6 9 6 6 6-6');
    isOpen = false;
  }

  // ── Click do botão ───────────────────────────────────────────────────────
  btn.onclick = () => isOpen ? closeCard() : openCard();

  // ── Fechar ao clicar fora ────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    if (!isOpen) return;
    if (btn.contains(e.target)) return;
    if (card && card.contains(e.target)) return;
    closeCard();
  });

  // ── Injeta no body ───────────────────────────────────────────────────────
  if (document.body) {
    document.body.appendChild(btn);
  } else {
    window.addEventListener('DOMContentLoaded', () =>
      document.body.appendChild(btn)
    );
  }
})();
