(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChenExplore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var statuses = { todo: '待学', read: '已读', review: '待复习' };
  function key(url) { return decodeURI(new URL(url, 'https://blog.local').pathname).replace(/index\.html$/, '').replace(/\/?$/, '/'); }
  function clean(value) {
    var result = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
    Object.keys(value).forEach(function (url) {
      var v = value[url];
      if (!url.startsWith('/') || url.startsWith('//') || !v || typeof v !== 'object') return;
      try {
        result[key(url)] = { saved: v.saved === true, status: Object.hasOwn(statuses, v.status) ? v.status : '',
          progress: Math.max(0, Math.min(1, Number(v.progress) || 0)), updated: Number(v.updated) || 0 };
      } catch (_) { /* A malformed entry must not prevent reading the others. */ }
    });
    return result;
  }
  function buildGraph(posts, roadmap) {
    var nodes = [], edges = [], groups = new Map();
    posts.forEach(function (p) {
      nodes.push({ id: p.url, label: p.title, type: 'article', url: p.url, groups: p.categories.length ? p.categories : ['随笔'], tags: p.tags });
      (p.categories.length ? p.categories : ['随笔']).forEach(function (c) {
        if (!groups.has(c)) { var id = 'category:' + c; groups.set(c, id); nodes.push({ id: id, label: c, type: 'category', groups: [c] }); }
        edges.push({ source: groups.get(c), target: p.url, type: 'category' });
      });
    });
    (roadmap.nodes || []).forEach(function (n) {
      var matches = posts.filter(function (p) {
        return (n.keywords || [n.label]).some(function (w) {
          var text = p.title + ' ' + p.tags.join(' ');
          // Short English terms such as TCP must not match inside ChatCPT.
          if (/^[\x00-\x7f]+$/.test(w)) return new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)', 'i').test(text);
          return text.toLowerCase().includes(w.toLowerCase());
        });
      });
      var id = 'concept:' + n.id;
      nodes.push({ id: id, label: n.label, type: matches.length ? 'concept' : 'planned', groups: [n.group], articles: matches.map(function (p) { return p.url; }) });
      if (!groups.has(n.group)) { groups.set(n.group, 'category:' + n.group); nodes.push({ id: groups.get(n.group), label: n.group, type: 'category', groups: [n.group] }); }
      edges.push({ source: groups.get(n.group), target: id, type: 'category' });
      matches.forEach(function (p) { edges.push({ source: id, target: p.url, type: 'concept' }); });
    });
    (roadmap.edges || []).forEach(function (e) {
      if (nodes.some(function (n) { return n.id === 'concept:' + e[0]; }) && nodes.some(function (n) { return n.id === 'concept:' + e[1]; })) edges.push({ source: 'concept:' + e[0], target: 'concept:' + e[1], type: 'prerequisite' });
    });
    return { nodes: nodes, edges: edges };
  }
  return { statuses: statuses, key: key, clean: clean, buildGraph: buildGraph };
});
