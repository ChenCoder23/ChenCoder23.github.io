/* 匿名访问统计：只发送路径，不发送查询参数、表单、姓名、学号或 IP。 */
(function () {
  'use strict';
  var script = document.querySelector('script[data-analytics-endpoint]');
  if (!script || navigator.doNotTrack === '1' || /(^|\/)admin(\/|$)/i.test(location.pathname)) return;
  var endpoint = script.dataset.analyticsEndpoint;
  try { if (new URL(endpoint).protocol !== 'https:' && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(endpoint)) return; } catch (e) { return; }
  var visitor;
  function id() { return crypto.randomUUID(); }
  try {
    visitor = sessionStorage.getItem('chenblog-visitor');
    if (!visitor) { visitor = id(); sessionStorage.setItem('chenblog-visitor', visitor); }
  } catch (e) { try { visitor = id(); } catch (ignored) { return; } }
  var visit = id(), duration = 0, activeSince = document.hidden ? null : Date.now();
  var referrer = '';
  try { referrer = new URL(document.referrer).origin; } catch (e) {}
  function send() {
    var now = Date.now();
    if (activeSince !== null) { duration += now - activeSince; activeSince = now; }
    fetch(endpoint.replace(/\/$/, '') + '/collect', { method: 'POST', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ id: visit, visitor: visitor,
        path: location.pathname, title: document.title, referrer: referrer, duration: Math.floor(duration / 1000) }) }).catch(function () {});
  }
  if (!document.hidden) send();
  setInterval(function () { if (!document.hidden) send(); }, 30000);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { send(); activeSince = null; }
    else { activeSince = Date.now(); send(); }
  });
  window.addEventListener('pagehide', function () { send(); activeSince = null; });
  window.addEventListener('pageshow', function (event) { if (event.persisted && !document.hidden) { activeSince = Date.now(); send(); } });
})();
