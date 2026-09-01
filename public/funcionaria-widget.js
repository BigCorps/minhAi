(function () {
  'use strict';

  if (window.__funcionariaWidgetLoaded) return;
  window.__funcionariaWidgetLoaded = true;

  var scripts = document.getElementsByTagName('script');
  var script = document.currentScript;
  if (!script) {
    for (var i = scripts.length - 1; i >= 0; i--) {
      if ((scripts[i].src || '').indexOf('funcionaria-widget.js') !== -1) {
        script = scripts[i];
        break;
      }
    }
  }
  if (!script) return;

  var slug = (script.getAttribute('data-slug') || '').trim();
  if (!slug) {
    console.warn('[FuncionarIA Widget] data-slug é obrigatório.');
    return;
  }

  var color = script.getAttribute('data-color') || '#6D28D9';
  var text = script.getAttribute('data-text') || 'Falar com a FuncionarIA';
  var position = script.getAttribute('data-position') || 'right';
  var size = script.getAttribute('data-size') || 'regular';
  var baseUrl = (script.getAttribute('data-base-url') || 'https://' + slug + '.funcionaria.net').replace(/\/$/, '');
  var iframeUrl = baseUrl + '/widget';

  var isLeft = position === 'left';
  var isCompact = size === 'compact';

  var root = document.createElement('div');
  root.id = 'funcionaria-widget-root-' + slug;
  root.style.position = 'fixed';
  root.style.zIndex = '2147483000';
  root.style.bottom = '20px';
  root.style[isLeft ? 'left' : 'right'] = '20px';
  root.style.fontFamily = 'Arial, sans-serif';

  var panel = document.createElement('div');
  panel.style.display = 'none';
  panel.style.position = 'absolute';
  panel.style.bottom = isCompact ? '66px' : '74px';
  panel.style[isLeft ? 'left' : 'right'] = '0';
  panel.style.width = 'min(390px, calc(100vw - 24px))';
  panel.style.height = 'min(650px, calc(100vh - 110px))';
  panel.style.background = '#fff';
  panel.style.borderRadius = '22px';
  panel.style.overflow = 'hidden';
  panel.style.boxShadow = '0 24px 70px rgba(15,23,42,.24)';
  panel.style.border = '1px solid rgba(15,23,42,.08)';

  var iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.title = 'FuncionarIA';
  iframe.allow = 'microphone; clipboard-write';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.style.background = '#fff';
  iframe.setAttribute('loading', 'lazy');
  panel.appendChild(iframe);

  var button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', text);
  button.style.border = '0';
  button.style.cursor = 'pointer';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.gap = '9px';
  button.style.borderRadius = '999px';
  button.style.padding = isCompact ? '12px 14px' : '14px 18px';
  button.style.background = color;
  button.style.color = '#fff';
  button.style.fontWeight = '800';
  button.style.fontSize = isCompact ? '13px' : '14px';
  button.style.boxShadow = '0 14px 36px rgba(15,23,42,.22)';
  button.style.maxWidth = 'calc(100vw - 40px)';

  var icon = document.createElement('span');
  icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5.1A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>';
  icon.style.display = 'flex';

  var label = document.createElement('span');
  label.textContent = text;
  label.style.whiteSpace = 'nowrap';
  label.style.overflow = 'hidden';
  label.style.textOverflow = 'ellipsis';

  button.appendChild(icon);
  button.appendChild(label);

  var open = false;
  function setOpen(next) {
    open = next;
    panel.style.display = open ? 'block' : 'none';
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  button.addEventListener('click', function () { setOpen(!open); });
  window.addEventListener('message', function (event) {
    if (event.data === 'funcionaria:close') setOpen(false);
  });

  root.appendChild(panel);
  root.appendChild(button);
  document.body.appendChild(root);
})();
