'use strict';
const { buildGraph } = require('../themes/chen/source/js/explore-core');
hexo.extend.generator.register('chen-explore', function (locals) {
  const urlFor = hexo.extend.helper.get('url_for').bind(hexo);
  const posts = locals.posts.sort('date', -1).toArray().map(p => ({
    title: p.title || '', url: urlFor(p.path.replace(/index\.html$/, '')),
    date: p.date.format('YYYY-MM-DD'), categories: p.categories.toArray().map(c => c.name), tags: p.tags.toArray().map(t => t.name)
  }));
  const taxonomy = require('../source/admin/category-tree');
  const categories = taxonomy.build((locals.data.site || {}).nav, locals.categories.toArray()).nodes.map(c => ({title: c.name, url: urlFor(c.path)}));
  return {path: 'explore.json', data: JSON.stringify({posts, categories, graph: buildGraph(posts, locals.data.knowledge || {})})};
});
