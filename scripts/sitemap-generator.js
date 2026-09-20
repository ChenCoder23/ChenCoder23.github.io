'use strict';

// 生成 /sitemap.xml 与 /robots.txt。
// sitemap 只收录真正可索引的页面：首页、文章、分类、标签、归档、自定义页面、搜索页；
// 404 页与 /admin/ 后台会被排除，并在 robots.txt 里明确 Disallow。

function xmlEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function iso(date) {
  var d = date instanceof Date ? date : (date && date.toDate ? date.toDate() : new Date(date));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

hexo.extend.generator.register('chenblog-sitemap', function (locals) {
  var config = hexo.config || {};
  var urlFor = hexo.extend.helper.get('url_for').bind(hexo);
  var siteUrl = String(config.url || '').replace(/\/+$/, '');
  // 页面 path 可能带 index.html（文章 path 已是干净目录），统一成规范 URL
  var abs = function (p) { return siteUrl + urlFor(String(p || '/').replace(/index\.html$/, '')); };

  var items = [];
  var seen = {};

  function add(pagePath, lastmod, changefreq, priority) {
    var url = abs(pagePath);
    if (!pagePath || seen[url]) return;
    seen[url] = true;
    items.push({
      loc: url,
      lastmod: lastmod ? iso(lastmod) : null,
      changefreq: changefreq || '',
      priority: priority || ''
    });
  }

  var posts = locals.posts.sort('date', -1).toArray();
  var newest = posts.length ? (posts[0].updated || posts[0].date) : null;

  posts.forEach(function (post) { add(post.path, post.updated || post.date, 'weekly', '0.8'); });
  add('/', newest, 'daily', '1.0');
  add('/archives/', newest, 'weekly', '0.5');
  add('/search/', null, 'monthly', '0.3');

  (locals.categories ? locals.categories.toArray() : []).forEach(function (cat) {
    if (!cat.length) return;
    add(cat.path, null, 'weekly', '0.4');
  });

  (locals.tags ? locals.tags.toArray() : []).forEach(function (tag) {
    if (!tag.length) return;
    add(tag.path, null, 'weekly', '0.3');
  });

  (locals.pages ? locals.pages.toArray() : []).forEach(function (page) {
    var source = String(page.source || '');
    var pagePath = String(page.path || '');
    if (page.sitemap === false) return;
    if (/^\/?404\.html$/.test(pagePath) || /^admin\//.test(source)) return;
    add(pagePath, page.updated || page.date, 'monthly', '0.6');
  });

  var body = items.map(function (item) {
    var lines = ['  <url>', '    <loc>' + xmlEsc(item.loc) + '</loc>'];
    if (item.lastmod) lines.push('    <lastmod>' + item.lastmod + '</lastmod>');
    if (item.changefreq) lines.push('    <changefreq>' + item.changefreq + '</changefreq>');
    if (item.priority) lines.push('    <priority>' + item.priority + '</priority>');
    lines.push('  </url>');
    return lines.join('\n');
  }).join('\n');

  var sitemap = '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    (body ? body + '\n' : '') +
    '</urlset>\n';

  var robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /search/',
    '',
    'Sitemap: ' + abs('/sitemap.xml'),
    ''
  ].join('\n');

  return [
    { path: 'sitemap.xml', data: sitemap },
    { path: 'robots.txt', data: robots }
  ];
});
