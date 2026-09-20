(function () {
  'use strict';

  var nodes = document.querySelectorAll('.math-tex[data-tex]');
  if (!nodes.length) return;

  var CFG = window.__CHEN_MATH__ || {};
  var BASES = Array.isArray(CFG.cdn) ? CFG.cdn.filter(Boolean) : [];
  if (!BASES.length) {
    BASES = ['https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/'];
  }

  /* ---------- 资源加载（多 CDN 依次回退） ---------- */
  function loadScript(index, done) {
    if (index >= BASES.length) { done(false); return; }
    var script = document.createElement('script');
    script.src = BASES[index] + 'katex.min.js';
    script.async = true;
    script.onload = function () { done(true); };
    script.onerror = function () {
      if (script.parentNode) script.parentNode.removeChild(script);
      loadScript(index + 1, done);
    };
    document.head.appendChild(script);
  }

  function loadCss(base, done) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + 'katex.min.css';
    link.onload = function () { done(true); };
    link.onerror = function () { done(false); };
    document.head.appendChild(link);
  }

  // 探测 KaTeX 样式表是否真的生效（样式里 .vlist-t 是 inline-table）
  function cssReady() {
    var probe = document.createElement('span');
    probe.className = 'vlist-t';
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    var display = window.getComputedStyle(probe).display;
    probe.parentNode.removeChild(probe);
    return display === 'inline-table';
  }

  /* ---------- 渲染 ---------- */
  function render() {
    var katex = window.katex;
    if (!katex) {
      document.documentElement.classList.add('math-failed');
      return;
    }
    Array.prototype.forEach.call(nodes, function (node) {
      var tex = node.getAttribute('data-tex') || '';
      var display = node.getAttribute('data-display') === '1';
      try {
        katex.render(tex, node, {
          displayMode: display,
          throwOnError: false,
          strict: false,
          trust: false,
          output: 'htmlAndMathml'
        });
        node.classList.add('is-rendered');
      } catch (err) {
        node.classList.add('is-broken');
      }
    });
    document.documentElement.classList.add('math-ready');
  }

  (function boot(index) {
    if (index >= BASES.length) {
      document.documentElement.classList.add('math-failed');
      return;
    }
    loadScript(index, function (ok) {
      if (!ok) {
        document.documentElement.classList.add('math-failed');
        return;
      }
      if (cssReady()) { render(); return; }
      loadCss(BASES[index], function () { render(); });
    });
  })(0);
})();
