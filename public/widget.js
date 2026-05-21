(function() {
  // Captura os dados do script atual
  const script = document.currentScript;
  const slug = script.dataset.slug;
  const cor = script.dataset.cor || '#3b82f6';
  const texto = script.dataset.texto || '💬 Assistente';
  const posicao = script.dataset.posicao || 'right';

  if (!slug) {
    console.error('minhAi Widget: data-slug é obrigatório.');
    return;
  }

  // Cria o botão flutuante
  const btn = document.createElement('button');
  btn.id = 'minhai-widget-button';
  btn.innerHTML = `
    <span style="margin-right: 8px;">${texto}</span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  `;
  
  // Estilização do botão
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    ${posicao}: 24px;
    z-index: 2147483647;
    background: ${cor};
    color: white;
    border: none;
    border-radius: 50px;
    padding: 14px 24px;
    font-size: 15px;
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

  // Efeitos de hover
  btn.onmouseover = () => {
    btn.style.transform = 'translateY(-4px)';
    btn.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)';
  };
  btn.onmouseout = () => {
    btn.style.transform = 'translateY(0)';
    btn.style.boxShadow = '0 6px 24px rgba(0,0,0,0.15)';
  };

  // Lógica de abertura do Popup
  btn.onclick = () => {
    const width = 420;
    const height = 720;
    
    // Centraliza o popup na tela
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    const popup = window.open(
      `https://${slug}.minhai.com.br/widget`,
      'minhAiWidget',
      `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=no,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert('Por favor, permita popups para falar com o assistente.');
    } else {
      popup.focus();
    }
  };

  // Injeta no body
  if (document.body) {
    document.body.appendChild(btn);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(btn);
    });
  }
})();
