'use strict';

// 生成 /atom.xml 与 /rss.xml（同为 Atom 1.0，内容一致），供 RSS 阅读器 / 订阅服务抓取。
// 只包含已发布文章（Hexo 的 posts 不含草稿），默认取最新 20 篇。

function xmlEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainText(html) {
  return String(html == null ? '' : html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cdata(html) {
  return '<![CDATA[' + String(html || '').replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
}

function iso(date) {
  var d = date instanceof Date ? date : (date && date.toDate ? date.toDate() : new Date(date));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

hexo.extend.generator.register('chenblog-feed', function (locals) {
  var config = hexo.config || {};
  if (config.feed === false) return;

  var urlFor = hexo.extend.helper.get('url_for').bind(hexo);
  var siteUrl = String(config.url || '').replace(/\/+$/, '');
  var abs = function (p) { return siteUrl + urlFor(String(p || '/').replace(/index\.html$/, '')); };
  var limit = Number(config.feed_limit) || 20;

  var posts = locals.posts.sort('date', -1).limit(limit).toArray();
  var siteTitle = config.title || 'Blog';
  var siteDesc = config.subtitle || config.description || '';
  var updated = posts.length ? iso(posts[0].updated || posts[0].date) : new Date().toISOString();

  var entries = posts.map(function (post) {
    var link = abs(post.path);
    var cats = (post.categories || []).map(function (c) {
      return '    <category term="' + xmlEsc(c.name) + '"/>';
    }).join('\n');
    var summary = plainText(post.content || post.excerpt || '');
    if (summary.length > 240) summary = summary.slice(0, 240) + '…';
    return [
      '  <entry>',
      '    <title>' + xmlEsc(post.title) + '</title>',
      '    <link href="' + xmlEsc(link) + '"/>',
      '    <id>' + xmlEsc(link) + '</id>',
      '    <updated>' + iso(post.updated || post.date) + '</updated>',
      '    <published>' + iso(post.date) + '</published>',
      '    <author><name>' + xmlEsc(config.author || siteTitle) + '</name></author>',
      cats,
      '    <summary type="text">' + xmlEsc(summary) + '</summary>',
      '    <content type="html">' + cdata(post.content || '') + '</content>',
      '  </entry>'
    ].filter(Boolean).join('\n');
  }).join('\n');

  var xml = '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="' + xmlEsc(config.language || 'zh-CN') + '">\n' +
    '  <title>' + xmlEsc(siteTitle) + '</title>\n' +
    (siteDesc ? '  <subtitle>' + xmlEsc(siteDesc) + '</subtitle>\n' : '') +
    '  <link href="' + xmlEsc(abs('/atom.xml')) + '" rel="self" type="application/atom+xml"/>\n' +
    '  <link href="' + xmlEsc(abs('/')) + '"/>\n' +
    '  <id>' + xmlEsc(abs('/')) + '</id>\n' +
    '  <updated>' + updated + '</updated>\n' +
    '  <author><name>' + xmlEsc(config.author || siteTitle) + '</name></author>\n' +
    '  <generator uri="https://hexo.io/" version="' + xmlEsc(hexo.version) + '">Hexo</generator>\n' +
    (entries ? entries + '\n' : '') +
    '</feed>\n';

  return [
    { path: 'atom.xml', data: xml },
    { path: 'rss.xml', data: xml }
  ];
});
