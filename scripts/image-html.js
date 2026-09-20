'use strict';

// 正文 / 封面图片在 HTML 侧的优化，配合 scripts/optimize-images.py 生成的压缩结果：
//   1. 自动补 loading="lazy" 与 decoding="async"（首屏图在模板里标了 fetchpriority="high"，保持立即加载）；
//   2. 从压缩清单里读回 width / height，图片还没下载完也不会把版面顶开（去掉 CLS）；
//   3. 存在同名 .webp 时包一层 <picture>，现代浏览器直接取 WebP（通常比 JPEG / PNG 小一半以上），
//      老浏览器读不懂 <source>，照旧取原来的文件，不会白屏。
// 清单是压缩脚本的产物（.image-originals/manifest.json）。没跑过压缩脚本时只做 1、2 两步。

var fs = require('fs');
var path = require('path');

// 只匹配标签本身；属性值里出现 > 也不会把标签提前截断
var IMG_RE = /<img\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

var cache = null;

function state() {
  if (cache) return cache;
  cache = {
    root: String(hexo.config.root || '/').replace(/\/+$/, ''),
    sourceDir: hexo.source_dir,
    manifest: {},
    webp: {}
  };
  try {
    var file = path.join(hexo.base_dir, '.image-originals', 'manifest.json');
    cache.manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    cache.manifest = {};
  }
  return cache;
}

function attrValue(attrs, name) {
  var matched = new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(attrs);
  if (!matched) return '';
  if (matched[1] !== undefined) return matched[1];
  if (matched[2] !== undefined) return matched[2];
  return matched[3] || '';
}

function hasAttr(attrs, name) {
  return new RegExp('\\b' + name + '(?:\\s*=|[\\s/>]|$)', 'i').test(attrs);
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 把站内绝对地址（/images/uploads/a.jpg）换算成 source 下的相对路径；外链、data: 返回空字符串
function sourceRelative(src) {
  var clean = String(src || '').split('#')[0].split('?')[0];
  if (!clean || /^[a-z][a-z0-9+.-]*:/i.test(clean) || clean.indexOf('//') === 0) return '';
  var root = state().root;
  if (root && (clean === root || clean.indexOf(root + '/') === 0)) clean = clean.slice(root.length);
  if (clean.charAt(0) !== '/') clean = '/' + clean;
  try {
    clean = decodeURIComponent(clean);
  } catch (err) {
    /* 解不开就用原样 */
  }
  return clean.replace(/^\/+/, '');
}

function webpSibling(rel) {
  var current = state();
  if (!rel || !/\.(png|jpe?g)$/i.test(rel)) return '';
  if (!(rel in current.webp)) {
    var candidate = rel.replace(/\.(png|jpe?g)$/i, '.webp');
    var found = '';
    try {
      if (fs.statSync(path.join(current.sourceDir, candidate)).isFile()) found = candidate;
    } catch (err) {
      /* 没有 WebP 版就继续用原图 */
    }
    current.webp[rel] = found;
  }
  return current.webp[rel];
}

// 保留原地址里的站点前缀，只把文件名换成 WebP 版
function webpUrl(src, sibling) {
  var parts = String(src).split('?');
  var tail = sibling.split('/').pop();
  var head = parts[0].replace(/[^/]*$/, tail);
  return parts.length > 1 ? head + '?' + parts.slice(1).join('?') : head;
}

hexo.extend.filter.register('after_render:html', function (html) {
  if (typeof html !== 'string' || html.indexOf('<img') < 0) return html;
  var current = state();

  return html.replace(IMG_RE, function (whole, attrs) {
    var src = attrValue(attrs, 'src');
    if (!src) return whole;

    var rel = sourceRelative(src);
    var meta = (rel && current.manifest[rel]) || null;
    var extra = '';

    if (!hasAttr(attrs, 'loading') && !/fetchpriority\s*=\s*["']high["']/i.test(attrs)) extra += ' loading="lazy"';
    if (!hasAttr(attrs, 'decoding')) extra += ' decoding="async"';
    if (meta && meta.width && meta.height && !hasAttr(attrs, 'width') && !hasAttr(attrs, 'height')) {
      extra += ' width="' + meta.width + '" height="' + meta.height + '"';
    }

    var rest = attrs.charAt(0) === '/' ? ' ' + attrs : attrs;   // 兼容 <img/>
    var out = '<img' + extra + rest + '>';

    var sibling = webpSibling(rel);
    if (sibling) {
      out = '<picture><source type="image/webp" srcset="' + escapeAttr(webpUrl(src, sibling)) + '">' + out + '</picture>';
    }
    return out;
  });
});
