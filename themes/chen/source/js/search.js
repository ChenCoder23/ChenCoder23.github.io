(function () {
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var count = document.getElementById('searchCount');
  var jsonUrl = window.__SEARCH_JSON__ || '/search.json';
  var data = [];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function strip(s) {
    return String(s || '')
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
      .replace(/\s+/g, ' ');
  }
  function excerpt(content, q, len) {
    var text = strip(content);
    var i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i < 0) i = 0;
    var start = Math.max(0, i - 30);
    var out = text.slice(start, start + len);
    return (start > 0 ? '…' : '') + out + (text.length > start + len ? '…' : '');
  }

  function itemHtml(item, q) {
    var cats = (item.categories || []).map(function (c) { return '<span class="cat">' + esc(c) + '</span>'; }).join('');
    var html = '<article class="search-item reveal"><h2><a href="' + esc(item.url) + '">' + esc(item.title) + '</a></h2>';
    html += '<div class="meta"><time>' + esc(item.date || '') + '</time>' + (cats ? '<span class="cats">' + cats + '</span>' : '') + '</div>';
    html += '<p class="excerpt">' + esc(excerpt(item.content, q || '', 140)) + '</p></article>';
    return html;
  }

  function afterRender() { if (window.ChenReveal) window.ChenReveal(); }

  function render() {
    if (!data.length) { return; }
    var q = (input.value || '').trim().toLowerCase();
    if (!q) {
      count.textContent = '共 ' + data.length + ' 篇文章';
      results.innerHTML = data.slice(0, 20).map(function (i) { return itemHtml(i, ''); }).join('');
      afterRender();
      return;
    }
    var hits = [];
    data.forEach(function (item) {
      var hay = [item.title, (item.categories || []).join(' '), (item.tags || []).join(' '), item.content].join(' ').toLowerCase();
      if (hay.indexOf(q) >= 0) hits.push(item);
    });
    count.textContent = '找到 ' + hits.length + ' 个结果';
    results.innerHTML = hits.slice(0, 50).map(function (i) { return itemHtml(i, q); }).join('') || '<p class="empty">没有找到相关文章。</p>';
    afterRender();
  }

  fetch(jsonUrl).then(function (r) { return r.json(); }).then(function (list) { data = list; render(); }).catch(function () { results.innerHTML = '<p class="empty">搜索索引加载失败。</p>'; });
  input.addEventListener('input', render);

  var m = location.search.match(/[?&]q=([^&]+)/);
  if (m) { input.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); }
})();