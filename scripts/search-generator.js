'use strict';

// 生成 /search.json，供前端静态搜索使用（只包含已发布文章，草稿不会进入）
hexo.extend.generator.register('chenblog-search', function (locals) {
  var url_for = hexo.extend.helper.get('url_for').bind(hexo);
  var posts = locals.posts.sort('date', -1).toArray().map(function (post) {
    return {
      title: post.title || '',
      url: url_for((post.path || '').replace(/index\.html$/, '')),
      date: post.date ? post.date.format('YYYY-MM-DD') : '',
      categories: (post.categories || []).map(function (c) { return c.name; }),
      tags: (post.tags || []).map(function (c) { return c.name; }),
      content: post.content || ''
    };
  });
  return { path: 'search.json', data: JSON.stringify(posts) };
});