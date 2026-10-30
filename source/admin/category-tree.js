(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChenCategories = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  function build(items, extra) {
    var nodes = [], map = new Map();
    (items || []).concat(extra || []).forEach(function (item) {
      if (!item || !item.name || item.path === '/' || map.has(item.name)) return;
      var node = {name: item.name, path: item.path || '/categories/' + encodeURIComponent(item.name) + '/', parent: item.parent || '', children: []};
      nodes.push(node); map.set(node.name, node);
    });
    nodes.forEach(function (node) {
      var seen = new Set([node.name]), parent = map.get(node.parent);
      while (parent) {
        if (seen.has(parent.name)) { node.parent = ''; break; }
        seen.add(parent.name); parent = map.get(parent.parent);
      }
      if (!map.has(node.parent)) node.parent = '';
    });
    nodes.forEach(function (node) { if (node.parent) map.get(node.parent).children.push(node); });
    return {nodes: nodes, roots: nodes.filter(function (n) { return !n.parent; }), map: map};
  }
  function trail(tree, name) {
    var result = [], node = tree.map.get(name);
    while (node) { result.unshift(node); node = tree.map.get(node.parent); }
    return result;
  }
  function names(tree, name) {
    var result = [];
    function visit(node) { result.push(node.name); node.children.forEach(visit); }
    var node = tree.map.get(name); if (node) visit(node);
    return result;
  }
  function flatten(tree) {
    var result = [];
    function visit(node, depth) { result.push({name: node.name, path: node.path, parent: node.parent, depth: depth}); node.children.forEach(function (n) { visit(n, depth + 1); }); }
    tree.roots.forEach(function (n) { visit(n, 0); }); return result;
  }
  return {build: build, trail: trail, names: names, flatten: flatten};
});
