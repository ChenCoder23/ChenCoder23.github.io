(function () {
  // 移动端导航
  var t = document.getElementById('navToggle');
  var n = document.getElementById('siteNav');
  if (t && n) t.addEventListener('click', function () { n.classList.toggle('open'); });

  // 深色 / 浅色主题
  var THEME_KEY = 'chenblog-theme';
  var btn = document.getElementById('themeToggle');
  function current() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function apply(theme) { document.documentElement.setAttribute('data-theme', theme); if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙'; }
  if (btn) {
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      apply(next);
    });
  }
  apply(current());

  // 滚动渐入（reveal）
  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal:not(.in)'));
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var group = el.closest('.post-list, .search-results, .archive-list') || el.parentElement;
        if (group) {
          var siblings = Array.prototype.slice.call(group.querySelectorAll('.reveal'));
          var idx = siblings.indexOf(el);
          if (idx >= 0) el.style.transitionDelay = (idx % 6) * 55 + 'ms';
        }
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }
  window.ChenReveal = initReveal;
  initReveal();

  // 阅读进度条
  var prog = document.getElementById('progress');
  if (prog) {
    var onProgress = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? ((window.scrollY || document.documentElement.scrollTop) / max) * 100 : 0;
      prog.style.width = p + '%';
    };
    window.addEventListener('scroll', onProgress, { passive: true });
    window.addEventListener('resize', onProgress, { passive: true });
    onProgress();
  }

  // 回到顶部
  var topBtn = document.getElementById('toTop');
  if (topBtn) {
    var onTop = function () { topBtn.classList.toggle('show', (window.scrollY || document.documentElement.scrollTop) > 420); };
    window.addEventListener('scroll', onTop, { passive: true });
    onTop();
    topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  // 当前导航高亮
  function initNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav a'));
    var path = location.pathname.replace(/\/+$/, '') || '/';
    links.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var hp = href.replace(/\/+$/, '');
      if (!hp || hp === '') return;
      if (hp === '/') { if (path === '/') a.classList.add('active'); }
      else if (path === hp || path.indexOf(hp + '/') === 0) a.classList.add('active');
    });
  }
  initNav();
})();