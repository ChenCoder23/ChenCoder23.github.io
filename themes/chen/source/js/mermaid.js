(function () {
  'use strict';

  // 服务端已经输出好 .mermaid-block 结构（源码放在 <pre class="mermaid-block__code">），
  // 这里只负责：加载 mermaid、画图、绑定「源码 / 复制」按钮、主题切换后重画。
  var blocks = Array.prototype.slice.call(document.querySelectorAll('[data-mermaid]'));
  if (!blocks.length) return;

  var CFG = window.__CHEN_MERMAID__ || {};
  var BASES = Array.isArray(CFG.cdn) ? CFG.cdn.filter(Boolean) : [];
  if (!BASES.length) BASES = ['https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/'];

  var views = blocks.map(function (el) {
    var codeEl = el.querySelector('.mermaid-block__code code');
    return {
      el: el,
      stage: el.querySelector('.mermaid-block__stage'),
      src: codeEl ? codeEl.textContent.replace(/\u00a0/g, ' ').replace(/\s+$/, '') : ''
    };
  });

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.parentNode.removeChild(ta);
    return Promise.resolve();
  }

  views.forEach(function (view) {
    var srcBtn = view.el.querySelector('[data-act="src"]');
    var copyBtn = view.el.querySelector('[data-act="copy"]');

    if (srcBtn) {
      srcBtn.addEventListener('click', function () {
        var open = view.el.classList.toggle('is-source-open');
        srcBtn.textContent = open ? '收起源码' : '源码';
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyText(view.src).then(function () {
          copyBtn.classList.add('is-done');
          var label = copyBtn.querySelector('span');
          if (label) label.textContent = '已复制';
          setTimeout(function () {
            copyBtn.classList.remove('is-done');
            if (label) label.textContent = '复制';
          }, 1600);
        });
      });
    }
  });

  function themeName() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
  }

  function fail(view, err) {
    view.el.classList.add('is-failed', 'is-source-open');
    var hint = view.el.querySelector('.mermaid-block__hint');
    if (hint) {
      hint.hidden = false;
      hint.textContent = '这张图没能渲染出来，已展开源码：' + String((err && err.message) || err || '未知错误').split('\n')[0];
    }
    var spin = view.el.querySelector('.mermaid-block__spin');
    if (spin) spin.remove();
    var srcBtn = view.el.querySelector('[data-act="src"]');
    if (srcBtn) srcBtn.textContent = '收起源码';
    if (window.console) console.warn('[chen] mermaid render failed:', err);
  }

  var seq = 0;

  function draw() {
    var mermaid = window.mermaid;
    if (!mermaid) {
      views.forEach(function (view) { fail(view, 'CDN 资源加载失败'); });
      return;
    }
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: themeName(),
      fontFamily: 'inherit',
      flowchart: { htmlLabels: false, useMaxWidth: true },
      sequence: { useMaxWidth: true },
      gantt: { useMaxWidth: true }
    });

    views.forEach(function (view, i) {
      var id = 'chen-mermaid-' + i + '-' + (seq++);
      var pending;
      try {
        pending = mermaid.render(id, view.src);
      } catch (err) {
        fail(view, err);
        return;
      }
      Promise.resolve(pending).then(function (result) {
        view.stage.innerHTML = result && result.svg ? result.svg : '';
        view.el.classList.add('is-ready');
      }).catch(function (err) { fail(view, err); });
    });
  }

  function loadScript(index) {
    if (index >= BASES.length) {
      views.forEach(function (view) { fail(view, 'CDN 资源加载失败'); });
      return;
    }
    var script = document.createElement('script');
    script.src = BASES[index] + 'mermaid.min.js';
    script.async = true;
    script.onload = draw;
    script.onerror = function () {
      if (script.parentNode) script.parentNode.removeChild(script);
      loadScript(index + 1);
    };
    document.head.appendChild(script);
  }

  loadScript(0);

  // 明暗主题切换后按新主题重画（mermaid 的配色写死在 SVG 里，不会跟着 CSS 变）
  if (window.MutationObserver) {
    var observer = new MutationObserver(function () { draw(); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
})();
