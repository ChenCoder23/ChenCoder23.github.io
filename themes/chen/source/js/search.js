(function () {
  'use strict';

  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var count = document.getElementById('searchCount');
  if (!input || !results) return;

  var jsonUrl = window.__SEARCH_JSON__ || '/search.json';
  var data = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function plain(s) {
    return String(s || '')
      .replace(/<figure[\s\S]*?<\/figure>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#x2F;/gi, '/')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#*`>\[\]()!|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function mark(text, query) {
    var safe = esc(text);
    if (!query) return safe;
    try {
      return safe.replace(new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    } catch (e) {
      return safe;
    }
  }

  function snippet(text, query) {
    var idx = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
    var start = idx > 40 ? idx - 40 : 0;
    var out = text.slice(start, start + 130);
    return (start > 0 ? '…' : '') + out + (text.length > start + 130 ? '…' : '');
  }

  function card(item, query) {
    var cats = (item.categories || []).map(function (c) {
      return '<span class="meta-chip meta-chip--cat">' + esc(c) + '</span>';
    }).join('');
    var tags = (item.tags || []).slice(0, 4).map(function (t) {
      return '<span class="tag-chip">' + esc(t) + '</span>';
    }).join('');
    var body = plain(item.content || '');
    return '<article class="card reveal">' +
      '<div class="card__body">' +
        '<div class="card__meta"><time>' + esc(item.date || '') + '</time>' + cats + '</div>' +
        '<h2 class="card__title"><a href="' + esc(item.url) + '">' + mark(item.title || '', query) + '</a></h2>' +
        '<p class="card__excerpt">' + mark(snippet(body, query), query) + '</p>' +
        (tags ? '<div class="card__foot"><span class="card__tags">' + tags + '</span></div>' : '') +
      '</div>' +
    '</article>';
  }

  function render() {
    var query = (input.value || '').trim();
    var lower = query.toLowerCase();
    var hits = !lower ? data : data.filter(function (item) {
      var hay = [item.title, (item.categories || []).join(' '), (item.tags || []).join(' '), plain(item.content)].join(' ').toLowerCase();
      return hay.indexOf(lower) >= 0;
    });

    if (count) {
      count.textContent = query ? '找到 ' + hits.length + ' 篇' : '共 ' + data.length + ' 篇';
    }
    var list = hits.slice(0, 50);
    results.innerHTML = list.length
      ? list.map(function (item) { return card(item, lower); }).join('')
      : '<p class="empty">没有找到相关文章。</p>';
    if (window.ChenReveal) window.ChenReveal();
  }

  fetch(jsonUrl)
    .then(function (res) { return res.json(); })
    .then(function (list) { data = Array.isArray(list) ? list : []; render(); })
    .catch(function () { results.innerHTML = '<p class="empty">搜索索引加载失败，请刷新重试。</p>'; });

  input.addEventListener('input', render);

  var m = location.search.match(/[?&]q=([^&]+)/);
  if (m) input.value = decodeURIComponent(m[1].replace(/\+/g, ' '));
  render();
  input.focus();
})();
