(function () {
  var t = document.getElementById('navToggle');
  var n = document.getElementById('siteNav');
  if (t && n) {
    t.addEventListener('click', function () { n.classList.toggle('open'); });
  }

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
})();