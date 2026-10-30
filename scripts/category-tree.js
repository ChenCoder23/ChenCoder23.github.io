'use strict';
const taxonomy = require('../source/admin/category-tree');
function tree(locals) {
  const data = locals.data.site || {};
  return taxonomy.build(data.nav, locals.categories.toArray());
}
hexo.extend.helper.register('chen_tree', function () { return tree(this.site); });
hexo.extend.helper.register('chen_trail', function (name) { return taxonomy.trail(tree(this.site), name); });
hexo.extend.helper.register('chen_category_posts', function (name) {
  const names = taxonomy.names(tree(this.site), name);
  return this.site.posts.toArray().filter(p => p.categories.toArray().some(c => names.includes(c.name)));
});
hexo.extend.generator.register('category', function (locals) {
  const categories = tree(locals);
  const posts = locals.posts.toArray();
  const routes = categories.nodes.map(node => ({
    path: decodeURI(node.path).replace(/^\//, '') + 'index.html', layout: ['category', 'index'],
    data: {category: node.name, posts: posts.filter(p => p.categories.toArray().some(c => taxonomy.names(categories, node.name).includes(c.name)))}
  }));
  routes.push({path: 'topics/index.html', layout: 'topics', data: {title: '分类目录'}});
  return routes;
});
