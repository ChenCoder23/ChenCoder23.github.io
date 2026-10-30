/* The sprite is CSS-driven: no per-frame JavaScript or canvas work. */
(function () {
  'use strict';
  var companion = document.querySelector('[data-coding-companion]');
  if (!companion) return;
  var button = companion.querySelector('[data-mascot-toggle]');
  var label = companion.querySelector('[data-mascot-label]');
  var wide = window.matchMedia('(min-width: 1440px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var paused = false;
  try { paused = localStorage.getItem('chenblog-mascot-paused') === '1'; } catch (_) {}

  function sync() {
    var playing = !paused && !reduced.matches && wide.matches && !document.hidden;
    companion.classList.toggle('is-playing', playing);
    button.disabled = reduced.matches;
    button.setAttribute('aria-pressed', String(!paused && !reduced.matches));
    button.setAttribute('aria-label', reduced.matches ? '小蜥蜴（已减少动态效果）' : (paused ? '播放小蜥蜴动画' : '暂停小蜥蜴动画'));
    label.textContent = paused ? '播放动画' : '暂停动画';
  }
  button.addEventListener('click', function () {
    paused = !paused;
    try { localStorage.setItem('chenblog-mascot-paused', paused ? '1' : '0'); } catch (_) {}
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  [wide, reduced].forEach(function (query) {
    if (query.addEventListener) query.addEventListener('change', sync);
    else query.addListener(sync);
  });
  sync();
}());
