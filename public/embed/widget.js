(function() {
  'use strict';

  // ウィジェット初期化
  function initWidget() {
    var container = document.getElementById('dental-diagnosis-widget');
    if (!container) {
      console.error('DentalCheck: Container element not found');
      return;
    }

    var clinicSlug = container.getAttribute('data-clinic');
    var diagnosisType = container.getAttribute('data-type') || 'oral-age';
    var width = container.getAttribute('data-width') || '100%';
    var height = container.getAttribute('data-height') || '700';

    if (!clinicSlug) {
      console.error('DentalCheck: data-clinic attribute is required');
      return;
    }

    // スクリプトのsrc属性からベースURLを取得
    var scripts = document.getElementsByTagName('script');
    var baseUrl = '';
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.indexOf('/embed/widget.js') !== -1) {
        baseUrl = src.replace('/embed/widget.js', '');
        break;
      }
    }

    if (!baseUrl) {
      baseUrl = 'https://dentalcheck.jp';
    }

    var embedUrl = baseUrl + '/embed/' + clinicSlug + '/' + diagnosisType;

    // iframeを作成
    var iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.width = width;
    iframe.height = height;
    iframe.frameBorder = '0';
    iframe.style.cssText = 'border: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);';
    iframe.setAttribute('allow', 'clipboard-write');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', '歯科診断ツール');

    // コンテナをクリアしてiframeを挿入
    container.innerHTML = '';
    container.appendChild(iframe);

    // 親ページとの通信（高さ調整用）
    window.addEventListener('message', function(event) {
      if (event.origin !== baseUrl) return;

      try {
        var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'resize' && data.height) {
          iframe.style.height = data.height + 'px';
        }
      } catch (e) {
        // パースエラーは無視
      }
    });
  }

  // DOMContentLoaded後に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
