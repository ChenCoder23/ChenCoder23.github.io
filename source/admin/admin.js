/* ChenBlog 后台管理
 * 纯静态页面，通过 GitHub Contents API 直接读写仓库（Git 即数据库）。
 * 结构：常量 → 工具 → GitHub API → 站点数据 → 文章解析 → 视图外壳 → 弹窗/同步状态
 *      → 文章列表 → 编辑器 → 分类管理 → 作业文档 → 站点设置 → 账号设置 → 路由与启动
 */
(function () {
'use strict';

// ---------- 常量 ----------
var LS_KEY = 'chenblog-admin-v1';
var LS_THEME = 'chenblog-admin-theme';
var LS_DRAFT = 'chenblog-editor-draft';
var API = 'https://api.github.com';
var DEFAULT_CFG = { owner: 'ChenCoder23', repo: 'ChenCoder23.github.io', branch: 'main', siteBase: '/' };
// 作业文档：.docx 提交到 source/files/homework/，清单写进 source/_data/homework.json
var HOMEWORK_DATA = 'source/_data/homework.json';
var HOMEWORK_DIR = 'source/files/homework/';
var HOMEWORK_URL_BASE = '/files/homework/';
var HOMEWORK_MAX_BYTES = 20 * 1024 * 1024;
var HOMEWORK_AUTHOR = '陈会闯';   // 写进 docx 属性的作者，跟 _config.yml 的 author 保持一致

var cfg = loadConfig();
var siteData = null;
var hwData = null;
var posts = [];
var listCache = [];
var listFilter = { q: '', status: 'all' };
var lastSync = null;
var state = { view: 'posts', file: null, hash: '#/posts', dirty: false };
var previewTimer = null;
var draftTimer = null;

// ---------- 基础工具 ----------
function loadConfig() { try { return Object.assign({}, DEFAULT_CFG, JSON.parse(localStorage.getItem(LS_KEY)) || {}); } catch (e) { return Object.assign({}, DEFAULT_CFG); } }
function saveConfig() { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); }

function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function escAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }
function toast(msg, isErr) { var t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (isErr ? ' error' : ''); clearTimeout(t._t); t._t = setTimeout(function () { t.className = 'toast'; }, 3200); }

function b64encode(str) { var bytes = new TextEncoder().encode(str); var bin = ''; for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin); }
function b64decode(b64) { var bin = atob(String(b64).replace(/\s/g, '')); var bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder('utf-8').decode(bytes); }

function pad(n) { return (n < 10 ? '0' : '') + n; }
function slugify(s) {
  var r = String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!r) r = 'post-' + Date.now().toString(36);
  return r;
}
function nowStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00'; }
function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function fmtDate(d) { if (!d) return ''; if (d instanceof Date) return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); return String(d).slice(0, 10); }
function fmtTime(ts) { var d = new Date(ts || Date.now()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function dateToInput(d) {
  if (!d) return '';
  if (d instanceof Date) return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  return String(d).replace(' ', 'T').slice(0, 16);
}
function toArr(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
function countWords(txt) {
  var s = String(txt || '');
  var cn = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
  var en = (s.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length;
  return cn + en;
}
function insertAtCursor(ta, text) {
  var start = ta.selectionStart || 0, end = ta.selectionEnd || 0;
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = start + text.length;
}
function publicUrl(sitePath) { var base = (cfg.siteBase || '/').replace(/\/+$/, ''); var p = String(sitePath || ''); return base + (p.charAt(0) === '/' ? p : '/' + p); }
function hasConfig() { return !!(cfg.token && cfg.owner && cfg.repo); }
function actionsUrl() { return 'https://github.com/' + encodeURIComponent(cfg.owner || '') + '/' + encodeURIComponent(cfg.repo || '') + '/actions'; }
function siteOrigin() { return location.protocol === 'file:' ? '' : location.origin; }

// 线性图标（与前台主题同款风格）
var SVG_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
function svg(body) { return SVG_OPEN + body + '</svg>'; }
var ICONS = {
  refresh: svg('<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v5h-5"/>'),
  moon: svg('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  save: svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M8 3v6h8"/><path d="M7 21v-6h10v6"/>'),
  back: svg('<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  up: svg('<path d="m6 14 6-6 6 6"/>'),
  down: svg('<path d="m6 10 6 6 6-6"/>'),
  trash: svg('<path d="M4 7h16M9 7V5h6v2"/><path d="m6 7 1 13h10l1-13"/>'),
  eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>'),
  bold: svg('<path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7z"/><path d="M7 12h7.5a3.5 3.5 0 0 1 0 7H7z"/>'),
  italic: svg('<path d="M15 5h-6M13 19H7M14 5 10 19"/>'),
  heading: svg('<path d="M6 5v14M18 5v14M6 12h12"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'),
  ordered: svg('<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 5.5h1.5V10M3.5 10h3.5"/><path d="M3.5 15h3.5v1.5L4 19.5h3.5"/>'),
  quote: svg('<path d="M7 7H4.5A1.5 1.5 0 0 0 3 8.5v3A1.5 1.5 0 0 0 4.5 13H7v2.5c0 1-.8 1.5-2 1.5"/><path d="M18 7h-2.5A1.5 1.5 0 0 0 14 8.5v3A1.5 1.5 0 0 0 15.5 13H18v2.5c0 1-.8 1.5-2 1.5"/>'),
  code: svg('<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>'),
  codeblock: svg('<path d="M4 5h16v14H4z"/><path d="m9 10-2 2 2 2M15 10l2 2-2 2"/>'),
  link: svg('<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  image: svg('<path d="M4 5h16v14H4z"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4 4 3 3-2 4 3"/>'),
  table: svg('<path d="M4 5h16v14H4z"/><path d="M4 10h16M10 10v9"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  upload: svg('<path d="M12 17V5"/><path d="m7 10 5-5 5 5"/><path d="M4 20h16"/>'),
  file: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>')
};
function icon(name) { return ICONS[name] || ''; }

// ---------- GitHub API ----------
function gh(method, path, body) {
  if (!cfg.token || !cfg.owner || !cfg.repo) return Promise.reject(new Error('请先在「账号设置」中填写 Token 和仓库信息'));
  var url = API + '/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo) + '/contents/' + path + '?ref=' + encodeURIComponent(cfg.branch || 'main');
  var headers = { 'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  var opts = { method: method, headers: headers };
  if (body !== undefined && body !== null) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return fetch(url, opts).then(function (res) {
    if (res.status === 404 || res.status === 204) return null;
    return res.json().then(function (j) { if (!res.ok) throw new Error(j.message || ('GitHub API ' + res.status)); return j; });
  });
}

function getFile(path) { return gh('GET', path).then(function (f) { if (!f) return null; return { path: path, sha: f.sha, content: b64decode(f.content) }; }); }
function listDir(path) { return gh('GET', path).then(function (files) { return files || []; }); }

// ---------- 站点数据（首页文案 + 背景图 + 导航分类） ----------
function defaultSiteData() { return { background: '', nav: [{ name: '首页', path: '/' }], hero: { title: '', desc: '' } }; }
function loadSiteData() {
  return getFile('source/_data/site.json').then(function (f) {
    if (!f) { siteData = defaultSiteData(); return siteData; }
    try { siteData = JSON.parse(f.content); } catch (e) { siteData = defaultSiteData(); }
    if (!Array.isArray(siteData.nav)) siteData.nav = defaultSiteData().nav;
    if (typeof siteData.background !== 'string') siteData.background = '';
    if (!siteData.hero || typeof siteData.hero !== 'object') siteData.hero = { title: '', desc: '' };
    if (typeof siteData.hero.title !== 'string') siteData.hero.title = '';
    if (typeof siteData.hero.desc !== 'string') siteData.hero.desc = '';
    return siteData;
  });
}
function saveSiteData(msg) {
  var body = { message: msg || '更新站点数据', content: b64encode(JSON.stringify(siteData, null, 2) + '\n'), branch: cfg.branch || 'main' };
  return gh('GET', 'source/_data/site.json').then(function (f) { if (f) body.sha = f.sha; return gh('PUT', 'source/_data/site.json', body); });
}

function categoryItems() {
  return (siteData && Array.isArray(siteData.nav)) ? siteData.nav.filter(function (i) { return i.path && i.path !== '/'; }) : [];
}
function catPath(name) { return '/categories/' + encodeURIComponent(name) + '/'; }

// ---------- 文章（发布 + 草稿） ----------
function postPath(name, draft) { return draft ? 'source/_drafts/' + name : 'source/_posts/' + name; }
function loadPosts() {
  return Promise.all([listDir('source/_posts'), listDir('source/_drafts')]).then(function (r) {
    var pub = (r[0] || []).filter(function (f) { return f.type === 'file' && /\.md$/i.test(f.name); }).map(function (f) { return { name: f.name, draft: false }; });
    var drf = (r[1] || []).filter(function (f) { return f.type === 'file' && /\.md$/i.test(f.name); }).map(function (f) { return { name: f.name, draft: true }; });
    posts = pub.concat(drf);
    return posts;
  });
}

function parseYaml(str) {
  if (typeof jsyaml !== 'undefined' && jsyaml.load) { try { return jsyaml.load(str) || {}; } catch (e) {} }
  var obj = {}, listKey = null;
  String(str || '').split(/\r?\n/).forEach(function (line) {
    var m = line.match(/^\s*-\s+(.*)$/);
    if (m) { if (listKey) { (obj[listKey] = obj[listKey] || []).push(m[1].replace(/^['"]|['"]$/g, '')); } return; }
    var kv = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (kv) { var k = kv[1], v = kv[2].replace(/^['"]|['"]$/g, ''); if (v === 'true') v = true; else if (v === 'false') v = false; obj[k] = v; listKey = k; }
  });
  return obj;
}
function parseFrontMatter(raw) {
  var m = raw.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/);
  var fm = {}, content = raw;
  if (m) { fm = parseYaml(m[1]); content = m[2] || ''; }
  return { fm: fm, content: content.replace(/^\r?\n/, '') };
}
function dumpYaml(obj) {
  if (typeof jsyaml !== 'undefined' && jsyaml.dump) { try { return jsyaml.dump(obj, { lineWidth: -1 }); } catch (e) {} }
  var lines = [];
  Object.keys(obj).forEach(function (k) {
    var v = obj[k];
    if (Array.isArray(v)) { lines.push(k + ':'); v.forEach(function (item) { lines.push('  - ' + String(item)); }); }
    else if (typeof v === 'boolean') { lines.push(k + ': ' + (v ? 'true' : 'false')); }
    else { lines.push(k + ': ' + String(v)); }
  });
  return lines.join('\n');
}
function postFromParsed(p) {
  return {
    title: p.fm.title || '',
    date: p.fm.date || nowStr(),
    categories: toArr(p.fm.categories),
    tags: toArr(p.fm.tags),
    comments: p.fm.comments !== false,
    cover: p.fm.cover || '',
    sticky: !!p.fm.sticky,
    content: p.content || ''
  };
}
function dedentContent(txt) {
  var lines = String(txt || '').replace(/\r\n/g, '\n').split('\n');
  var min = Infinity;
  lines.forEach(function (l) {
    if (!l.trim()) return;
    var m = l.match(/^[ \t]+/);
    if (m) { min = Math.min(min, m[0].replace(/\t/g, '    ').length); }
    else { min = 0; }
  });
  if (!isFinite(min) || min === 0) return lines.join('\n');
  return lines.map(function (l) { return l.slice(min); }).join('\n');
}
function buildRaw(p) {
  if (p && typeof p.content === 'string') { p.content = dedentContent(p.content); }
  var obj = {};
  if (p.title) obj.title = p.title;
  if (p.date) obj.date = p.date;
  if (p.categories && p.categories.length) obj.categories = p.categories;
  if (p.tags && p.tags.length) obj.tags = p.tags;
  obj.comments = p.comments !== false;
  if (p.cover) obj.cover = p.cover;
  obj.sticky = !!p.sticky;
  return '---\n' + dumpYaml(obj) + '---\n\n' + (p.content || '') + '\n';
}

function renderMarkdown(txt) { if (typeof marked !== 'undefined' && marked.parse) { return marked.parse(txt); } return '<pre>' + esc(txt) + '</pre>'; }

function putFile(path, raw, sha, message) {
  var body = { message: message, content: b64encode(raw), branch: cfg.branch || 'main' };
  if (sha) body.sha = sha;
  return gh('PUT', path, body);
}
function deleteFile(path, sha, message) { return gh('DELETE', path, { message: message, sha: sha, branch: cfg.branch || 'main' }); }
function moveFile(fromPath, fromSha, toPath, message, raw) {
  return putFile(toPath, raw, null, message).then(function () { return deleteFile(fromPath, fromSha, message); });
}

// ---------- 上传前先压一道 ----------
// 后台是把文件直接提交进仓库的：相机原图（5000x4000）动辄十几 MB，截图 PNG 也有 1~2MB，
// 原样上线读者就得等半天。所以先在浏览器里等比缩到合理尺寸再编码上传，通常只剩几个百分点。
var UPLOAD_PRESETS = {
  background: { maxEdge: 2560, quality: 0.82 },
  uploads: { maxEdge: 1600, quality: 0.85 }
};
var KEEP_AS_IS = /^image\/(gif|svg\+xml)$/i;     // 动图、矢量图重编码会丢东西，原样上传

function loadImageSource(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file).then(function (bitmap) {
      return {
        image: bitmap, width: bitmap.width, height: bitmap.height,
        release: function () { if (bitmap.close) bitmap.close(); }
      };
    }).catch(function () { return loadImageElement(file); });
  }
  return loadImageElement(file);
}
function loadImageElement(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var im = new Image();
    im.onload = function () {
      resolve({
        image: im, width: im.naturalWidth, height: im.naturalHeight,
        release: function () { URL.revokeObjectURL(url); }
      });
    };
    im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('图片解码失败')); };
    im.src = url;
  });
}
function canvasToBlob(canvas, type, quality) {
  return new Promise(function (resolve) {
    if (!canvas.toBlob) { resolve(null); return; }
    canvas.toBlob(function (blob) { resolve(blob); }, type, quality);
  });
}
// 压完反而更大（小图重新编码很常见）或解码失败时，一律退回原文件，保证上传链路不会断
function compressImage(file, folder) {
  var fallback = { blob: file, type: file.type || '' };
  if (KEEP_AS_IS.test(file.type || '') || /\.(gif|svg)$/i.test(file.name || '')) return Promise.resolve(fallback);
  var preset = UPLOAD_PRESETS[folder] || UPLOAD_PRESETS.uploads;
  return loadImageSource(file).then(function (src) {
    if (!src.width || !src.height) return fallback;
    var scale = Math.min(1, preset.maxEdge / Math.max(src.width, src.height));
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(src.width * scale));
    canvas.height = Math.max(1, Math.round(src.height * scale));
    var ctx = canvas.getContext('2d');
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src.image, 0, 0, canvas.width, canvas.height);
    if (src.release) src.release();
    return canvasToBlob(canvas, 'image/webp', preset.quality).then(function (blob) {
      if (blob && blob.size) return { blob: blob, type: blob.type || 'image/webp' };
      var keepPng = /png/i.test(file.type || '');
      return canvasToBlob(canvas, keepPng ? 'image/png' : 'image/jpeg', preset.quality).then(function (other) {
        if (other && other.size) return { blob: other, type: other.type || (keepPng ? 'image/png' : 'image/jpeg') };
        return fallback;
      });
    });
  }).then(function (out) {
    if (out.blob && out.blob.size && out.blob.size < file.size) {
      console.log('[图片压缩] ' + file.name + '：' + Math.round(file.size / 1024) + 'KB -> ' + Math.round(out.blob.size / 1024) + 'KB');
      return out;
    }
    return fallback;
  }).catch(function () { return fallback; });
}

function uploadImage(file, folder) {
  return compressImage(file, folder).then(function (out) {
    var blob = out.blob || file;
    var type = out.type || file.type || '';
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('读取文件失败')); };
      reader.readAsDataURL(blob);
    }).then(function (dataUrl) {
      var base64 = dataUrl.split(',')[1] || '';
      if (!base64) throw new Error('图片数据为空');
      var safe = String(file.name || '').replace(/[^\w.\-]+/g, '-') || 'image';
      // 重编码后扩展名可能变了（png -> webp），跟着实际类型走
      var name = Date.now() + '-' + safe.replace(/\.[^.]*$/, '') + extFromMime(type);
      var path = 'source/images/' + folder + '/' + name;
      return gh('PUT', path, { message: '上传图片 ' + name, content: base64, branch: cfg.branch || 'main' }).then(function () {
        return '/images/' + folder + '/' + name;
      });
    });
  });
}

// ---------- 图片上传（选择 / 粘贴 / 拖拽） ----------
var MIME_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif', 'image/bmp': '.bmp' };
function extFromMime(mime) { return MIME_EXT[String(mime || '').toLowerCase()] || '.png'; }
function isImageFile(f) { return !!f && (/^image\//.test(f.type || '') || /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(f.name || '')); }
function imgAlt(f) {
  var base = String(f.name || '').replace(/\.[^.]+$/, '').replace(/[\[\]()]/g, '');
  return base || '图片';
}
function uploadAndInsertImages(files) {
  var imgs = Array.prototype.slice.call(files || []).filter(isImageFile);
  if (!imgs.length) { toast('没有检测到图片文件', true); return Promise.resolve(); }
  if (!hasConfig()) { toast('请先在「账号设置」中填写 Token', true); return Promise.resolve(); }
  var total = imgs.length, done = 0;
  toast(total > 1 ? ('正在上传 1/' + total + ' 张图片…') : '图片上传中…');
  var chain = Promise.resolve();
  imgs.forEach(function (f) {
    chain = chain.then(function () {
      return uploadImage(f, 'uploads').then(function (p) {
        insertBlock('![' + imgAlt(f) + '](' + publicUrl(p) + ')\n');
        done++;
        if (done < total) toast('正在上传 ' + (done + 1) + '/' + total + ' 张图片…');
      });
    });
  });
  return chain.then(function () {
    toast(done > 1 ? ('已插入 ' + done + ' 张图片') : '图片已插入');
  }).catch(function (err) {
    if (done) toast('已插入 ' + done + ' 张，其余上传失败', true);
    showError(err);
  });
}

// ---------- 主题 ----------
function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  try { localStorage.setItem(LS_THEME, t === 'dark' ? 'dark' : 'light'); } catch (e) {}
}
function toggleTheme() { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); }

// ---------- 视图外壳 ----------
function shell(title, desc) {
  var t = $('#topTitle'); if (t) t.textContent = title || '';
  var d = $('#topDesc'); if (d) d.textContent = desc || '';
}
function topActions(html) {
  var box = $('#topActions');
  if (!box) return;
  box.innerHTML = (html || '') +
    '<button class="iconbtn" type="button" id="themeBtn" title="切换深浅色" aria-label="切换深浅色">' +
      '<span class="i-moon">' + icon('moon') + '</span><span class="i-sun">' + icon('sun') + '</span>' +
    '</button>' +
    '<button class="iconbtn" type="button" id="reloadBtn" title="重新加载数据" aria-label="重新加载数据">' + icon('refresh') + '</button>';
  $('#themeBtn').addEventListener('click', toggleTheme);
  $('#reloadBtn').addEventListener('click', reload);
}
function syncSlotHtml() { return '<div id="syncSlot" class="mt-16">' + (lastSync ? syncCard(lastSync) : '') + '</div>'; }
function view(html) {
  var c = $('#content');
  c.innerHTML = '<div class="view">' + syncSlotHtml() + html + '</div>';
  bindSync($('#syncSlot'));
  window.scrollTo(0, 0);
  return c.firstChild;
}
function loading(text) { view('<p class="empty">' + esc(text || '加载中…') + '</p>'); }
function setActive(v) { $$('.nav-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === v); }); }
function ensureConfig() {
  if (!hasConfig()) { renderSettings(); toast('请先完成账号设置', true); return false; }
  return true;
}
function showError(e) { console.error(e); toast(e && e.message ? e.message : String(e), true); }
function setNavCount(el, n) { var b = $(el); if (b) b.textContent = n > 0 ? String(n) : ''; }

// ---------- 弹窗 ----------
function modal(opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var root = $('#modal-root');
    var withInput = typeof opts.value === 'string';
    root.innerHTML = '<div class="modal"><div class="modal__box" role="dialog" aria-modal="true">' +
      '<div class="modal__head">' + esc(opts.title || '提示') + '</div>' +
      '<div class="modal__body">' + (opts.body || '') +
        (withInput ? '<input class="input" id="modalInput" value="' + escAttr(opts.value) + '" placeholder="' + escAttr(opts.placeholder || '') + '">' : '') +
      '</div>' +
      '<div class="modal__foot">' +
        '<button class="btn ghost" type="button" id="modalCancel">' + esc(opts.cancelText || '取消') + '</button>' +
        '<button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" type="button" id="modalOk">' + esc(opts.okText || '确定') + '</button>' +
      '</div></div></div>';
    var overlay = root.firstChild;
    function done(val) {
      document.removeEventListener('keydown', onKey, true);
      root.innerHTML = '';
      resolve(val);
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); } }
    document.addEventListener('keydown', onKey, true);
    $('#modalOk').addEventListener('click', function () { done(withInput ? $('#modalInput').value.trim() : true); });
    $('#modalCancel').addEventListener('click', function () { done(null); });
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) done(null); });
    var inp = $('#modalInput');
    if (inp) {
      inp.focus(); inp.select();
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); done(inp.value.trim()); } });
    } else if ($('#modalOk')) { $('#modalOk').focus(); }
  });
}

// ---------- 同步状态（提交 → GitHub Actions → 线上生效） ----------
function syncCard(o) {
  o = o || {};
  var cls = 'sync' + (o.ok === true ? ' is-ok' : o.ok === false ? ' is-err' : '');
  var ic = o.ok === true ? icon('check') : o.ok === false ? icon('alert') : '<span class="spin"></span>';
  var acts = '<a class="btn small" href="' + escAttr(actionsUrl()) + '" target="_blank" rel="noopener">查看构建</a>';
  if (o.live) acts += '<button class="btn small" type="button" data-live="' + escAttr(o.live) + '">' + icon('ext') + '打开线上文章</button>';
  return '<div class="' + cls + '">' +
    '<span class="sync__icon">' + ic + '</span>' +
    '<span class="sync__text"><strong>' + esc(o.title || '') + '</strong><span>' + esc(o.desc || '') + '</span></span>' +
    '<span class="sync__actions">' + acts + '</span>' +
    '</div>';
}
function bindSync(root) {
  if (!root) return;
  $$('[data-live]', root).forEach(function (b) { b.addEventListener('click', function () { openLive(b.getAttribute('data-live')); }); });
}
function showSync(o) {
  lastSync = o;
  var slot = $('#syncSlot');
  if (slot) { slot.innerHTML = syncCard(o); bindSync(slot); }
}
function syncPending(title) { return { ok: null, title: '已提交到 GitHub', desc: 'Actions 正在构建，约 1-2 分钟后线上生效', live: title || '' }; }
function syncFailed(msg) { return { ok: false, title: '操作失败', desc: msg || '请检查网络连接与 Token 权限' }; }
function openLive(title) {
  if (!title) { toast('这篇文章还没有标题，无法定位线上地址', true); return; }
  toast('正在查找线上地址…');
  fetch(publicUrl('/search.json'), { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('读不到线上索引（构建可能仍在进行）');
    return r.json();
  }).then(function (list) {
    var hit = (list || []).filter(function (i) { return i.title === title; })[0];
    if (!hit) throw new Error('线上还没有这篇文章，请等构建完成后重试');
    window.open(siteOrigin() + hit.url, '_blank', 'noopener');
  }).catch(function (e) { toast(e.message || String(e), true); });
}

// ---------- 路由 ----------
var suppressHash = false;
function parseHash() {
  var raw = String(location.hash || '').replace(/^#\/?/, '');
  var qi = raw.indexOf('?');
  var name = (qi >= 0 ? raw.slice(0, qi) : raw).trim().toLowerCase();
  var params = {};
  var q = qi >= 0 ? raw.slice(qi + 1) : '';
  q.split('&').forEach(function (kv) {
    if (!kv) return;
    var i = kv.indexOf('=');
    var k = i < 0 ? kv : kv.slice(0, i);
    var v = i < 0 ? '' : kv.slice(i + 1);
    try { params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { params[k] = v; }
  });
  return { name: name || 'posts', params: params };
}
function setHash(h) { if (location.hash === h) route(); else location.hash = h; }
function route() {
  var r = parseHash();
  if (r.name === 'editor') {
    if (r.params.file) openEditorBySource(r.params.file);
    else renderEditor(null);
    return;
  }
  if (r.name === 'categories') { renderCategories(); return; }
  if (r.name === 'homework') { renderHomework(r.params); return; }
  if (r.name === 'site') { renderSite(); return; }
  if (r.name === 'settings') { renderSettings(); return; }
  renderPosts();
}
function confirmLeave(msg) {
  if (!state.dirty) return Promise.resolve(true);
  return modal({
    title: '有未保存的修改',
    body: msg || '离开当前页面会丢失未保存的编辑内容，确定继续吗？',
    okText: '放弃修改', danger: true
  }).then(function (ok) { return !!ok; });
}
function reload() {
  confirmLeave('重新加载会丢弃当前编辑内容，确定继续吗？').then(function (ok) {
    if (!ok) return;
    state.dirty = false;
    clearDraft();
    route();
  });
}
function onHashChange() {
  if (suppressHash) { suppressHash = false; return; }
  if (state.dirty && state.view === 'editor') {
    var back = state.hash || '#/editor';
    confirmLeave().then(function (ok) {
      if (ok) { state.dirty = false; clearDraft(); route(); return; }
      suppressHash = true;
      try { history.replaceState(null, '', back); } catch (e) { location.hash = back; }
      setTimeout(function () { suppressHash = false; }, 0);
    });
    return;
  }
  route();
}
function navClick(href) {
  confirmLeave().then(function (ok) {
    if (!ok) return;
    state.dirty = false;
    clearDraft();
    setHash(href);
  });
}

// ---------- 文章列表 ----------
function option(value, label, selected) { return '<option value="' + escAttr(value) + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>'; }
function statCard(label, value) { return '<div class="stat"><p class="stat__label">' + esc(label) + '</p><p class="stat__value">' + esc(String(value)) + '</p></div>'; }
function itemByKey(key) {
  if (!key) return null;
  var parts = String(key).split('|');
  return listCache.filter(function (i) { return i.file === parts[0] && String(i.draft) === parts[1]; })[0] || null;
}
function filterPosts() {
  var q = (listFilter.q || '').trim().toLowerCase();
  return listCache.filter(function (i) {
    if (listFilter.status === 'published' && i.draft) return false;
    if (listFilter.status === 'draft' && !i.draft) return false;
    if (!q) return true;
    var hay = [i.fm.title || '', i.file, toArr(i.fm.categories).join(' '), toArr(i.fm.tags).join(' ')].join(' ').toLowerCase();
    return hay.indexOf(q) >= 0;
  });
}

function renderPosts() {
  if (!ensureConfig()) return;
  state.view = 'posts';
  state.file = null;
  state.dirty = false;
  setActive('posts');
  shell('文章管理', '点击任意一行直接编辑，保存后自动同步到博客');
  topActions('<button class="btn primary" type="button" id="newPostBtn">' + icon('plus') + '新建文章</button>');
  $('#newPostBtn').addEventListener('click', function () { navClick('#/editor'); });
  loading('正在读取仓库…');
  Promise.all([loadListCache(), loadSiteData()]).then(function () {
    setNavCount('#navCountCats', categoryItems().length);
    paintPosts();
  }).catch(showError);
}

function paintPosts() {
  var published = 0, drafts = 0, catSet = {}, tagSet = {};
  listCache.forEach(function (i) {
    if (i.draft) drafts++; else published++;
    toArr(i.fm.categories).forEach(function (c) { catSet[c] = 1; });
    toArr(i.fm.tags).forEach(function (t) { tagSet[t] = 1; });
  });
  var rows = filterPosts();
  var html = '';
  html += '<div class="stats">' +
    statCard('已发布', published) + statCard('草稿', drafts) +
    statCard('分类', Object.keys(catSet).length) + statCard('标签', Object.keys(tagSet).length) +
    '</div>';
  html += '<div class="toolbar mt-16">' +
    '<input class="input grow" id="postSearch" type="search" placeholder="搜索标题、文件名、分类或标签…" value="' + escAttr(listFilter.q) + '">' +
    '<select class="select" id="postStatusFilter">' +
      option('all', '全部状态', listFilter.status === 'all') +
      option('published', '只看已发布', listFilter.status === 'published') +
      option('draft', '只看草稿', listFilter.status === 'draft') +
    '</select>' +
    '<span class="hint" id="postCount">共 ' + rows.length + ' 篇</span>' +
    '</div>';
  html += '<div class="panel">';
  if (!rows.length) {
    html += '<p class="empty">' + (listCache.length ? '没有匹配的文章，换个关键词试试。' : '仓库里还没有文章，点右上角「新建文章」开始写作。') + '</p>';
  } else {
    html += '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>标题</th><th>状态</th><th>分类</th><th>日期</th><th>评论</th><th>字数</th><th class="td-actions">操作</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (i) {
      var key = escAttr(i.file + '|' + i.draft);
      var cats = toArr(i.fm.categories);
      html += '<tr data-key="' + key + '">' +
        '<td class="td-title"><span>' + esc(i.fm.title || i.file) + '</span></td>' +
        '<td>' + (i.draft ? '<span class="tag tag--warn">草稿</span>' : '<span class="tag tag--ok">已发布</span>') + (i.fm.sticky ? ' <span class="tag tag--accent">置顶</span>' : '') + '</td>' +
        '<td>' + (cats.length ? esc(cats.join('、')) : '<span class="td-mono">未分类</span>') + '</td>' +
        '<td class="td-mono">' + esc(fmtDate(i.fm.date)) + '</td>' +
        '<td>' + (i.fm.comments !== false ? '允许' : '<span class="tag tag--plain">关闭</span>') + '</td>' +
        '<td class="td-mono">' + i.chars + '</td>' +
        '<td class="td-actions">' +
          '<button class="btn small edit" type="button" data-key="' + key + '">编辑</button>' +
          '<button class="btn small toggle" type="button" data-key="' + key + '">' + (i.draft ? '发布' : '转草稿') + '</button>' +
          '<button class="btn small danger del" type="button" data-key="' + key + '">删除</button>' +
        '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';
  var recent = listCache.slice().sort(function (a, b) { return String(b.fm.date || '').localeCompare(String(a.fm.date || '')); }).slice(0, 5);
  if (recent.length) {
    html += '<div class="panel mt-16"><div class="panel__head"><h2>最近更新</h2></div><div class="panel__body"><ul class="list-simple">' +
      recent.map(function (i) {
        return '<li><time>' + esc(fmtDate(i.fm.date)) + '</time>' +
          '<a href="#/editor?file=' + encodeURIComponent(i.source) + '">' + esc(i.fm.title || i.file) + '</a>' +
          (i.draft ? '<span class="tag tag--warn">草稿</span>' : '') + '</li>';
      }).join('') +
      '</ul></div></div>';
  }
  view(html);
  bindPosts();
}

function bindPosts() {
  var search = $('#postSearch');
  if (search) {
    search.addEventListener('input', function () {
      listFilter.q = search.value;
      paintPosts();
      var s2 = $('#postSearch');
      if (s2) { s2.focus(); try { s2.setSelectionRange(s2.value.length, s2.value.length); } catch (e) {} }
    });
  }
  var sel = $('#postStatusFilter');
  if (sel) sel.addEventListener('change', function () { listFilter.status = sel.value; paintPosts(); });
  $$('table.table tbody tr').forEach(function (tr) {
    tr.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.td-actions')) return;
      var item = itemByKey(tr.getAttribute('data-key'));
      if (item) navClick('#/editor?file=' + encodeURIComponent(item.source));
    });
  });
  $$('.edit').forEach(function (b) { b.addEventListener('click', function () { var i = itemByKey(b.getAttribute('data-key')); if (i) navClick('#/editor?file=' + encodeURIComponent(i.source)); }); });
  $$('.toggle').forEach(function (b) { b.addEventListener('click', function () { toggleDraft(itemByKey(b.getAttribute('data-key'))); }); });
  $$('.del').forEach(function (b) { b.addEventListener('click', function () { deletePost(itemByKey(b.getAttribute('data-key'))); }); });
}

function toggleDraft(entry) {
  if (!entry) return;
  var p = parseFrontMatter(entry.content);
  var raw = buildRaw(postFromParsed(p));
  toast('正在提交…');
  var op;
  if (entry.draft) {
    var date = fmtDate(p.fm.date) || todayStr();
    var slug = entry.file.replace(/\.md$/i, '');
    op = moveFile(postPath(entry.file, true), entry.sha, postPath(date + '-' + slug + '.md', false), '发布草稿 ' + slug, raw);
  } else {
    var slug2 = entry.file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/i, '');
    op = moveFile(postPath(entry.file, false), entry.sha, postPath(slug2 + '.md', true), '转为草稿 ' + slug2, raw);
  }
  op.then(function () {
    toast(entry.draft ? '草稿已发布' : '已转为草稿');
    showSync(syncPending(p.fm.title || entry.file));
    renderPosts();
  }).catch(function (e) { showSync(syncFailed(e && e.message)); showError(e); });
}

function deletePost(entry) {
  if (!entry) return;
  modal({
    title: '删除文章',
    body: '<p>确定删除「' + esc(entry.fm.title || entry.file) + '」吗？该操作会直接提交到 GitHub 仓库，后台无法撤销。</p>',
    okText: '删除', danger: true
  }).then(function (ok) {
    if (!ok) return null;
    toast('正在删除…');
    return deleteFile(postPath(entry.file, entry.draft), entry.sha, '删除文章 ' + entry.file).then(function () {
      toast('已删除');
      showSync(syncPending(''));
      renderPosts();
    });
  }).catch(showError);
}

// ---------- 文章编辑器 ----------
var MD_TOOLS = [
  { k: 'bold', t: '加粗（Ctrl/⌘+B）' },
  { k: 'italic', t: '斜体（Ctrl/⌘+I）' },
  { k: 'heading', t: '二级标题' },
  { sep: true },
  { k: 'list', t: '无序列表' },
  { k: 'ordered', t: '有序列表' },
  { k: 'quote', t: '引用' },
  { sep: true },
  { k: 'code', t: '行内代码' },
  { k: 'codeblock', t: '代码块' },
  { k: 'link', t: '链接（Ctrl/⌘+K）' },
  { sep: true },
  { k: 'table', t: '插入表格' },
  { k: 'image', t: '上传并插入图片（也支持粘贴 / 拖拽）' }
];
function editorBarHtml() {
  return MD_TOOLS.map(function (t) {
    if (t.sep) return '<span class="editor-bar__sep"></span>';
    return '<button class="editor-bar__btn" type="button" data-md="' + t.k + '" title="' + escAttr(t.t) + '" aria-label="' + escAttr(t.t) + '">' + icon(t.k) + '</button>';
  }).join('') +
    '<span class="editor-bar__spacer"></span>' +
    '<span class="editor-bar__hint">可直接粘贴 / 拖入图片</span>' +
    '<span class="editor-bar__stat" id="editorStat">0 字 · 0 行</span>' +
    '<input type="file" id="postImageFile" accept="image/*" hidden>';
}
function slugValue(entry) { return entry ? entry.file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '') : ''; }

function renderEditor(entry) {
  if (!ensureConfig()) return;
  state.view = 'editor';
  state.file = entry || null;
  state.dirty = false;
  setActive('editor');
  var parsed = entry ? parseFrontMatter(entry.content) : { fm: {}, content: '' };
  var isDraft = entry ? !!entry.draft : false;
  state.hash = '#/editor' + (entry && entry.source ? '?file=' + encodeURIComponent(entry.source) : '');
  shell(isDraft ? '编辑草稿' : (entry ? '编辑文章' : '写新文章'),
    entry ? (entry.source || '') : '正文支持 Markdown，右侧实时预览，Ctrl/⌘+S 保存');
  topActions('<button class="btn" type="button" id="backBtn">' + icon('back') + '返回列表</button>' +
    '<button class="btn primary" type="button" id="saveTopBtn">' + icon('save') + '保存</button>');
  $('#backBtn').addEventListener('click', function () { navClick('#/posts'); });
  $('#saveTopBtn').addEventListener('click', saveCurrent);
  loading('正在准备编辑器…');

  loadSiteData().then(function () {
    var cats = categoryItems();
    var selected = toArr(parsed.fm.categories);
    var html = '';
    html += '<div class="panel">' +
      '<div class="panel__head"><h2>文章信息</h2>' +
        '<span class="tag ' + (isDraft ? 'tag--warn' : 'tag--ok') + '">' + (isDraft ? '草稿' : '已发布') + '</span>' +
        '<button class="btn small ghost" type="button" id="metaToggle">收起</button>' +
      '</div>' +
      '<div class="panel__body" id="metaBody">' +
        '<div class="field"><label for="postTitle">标题</label><input class="input" id="postTitle" type="text" value="' + escAttr(parsed.fm.title || '') + '" placeholder="给这篇文章起个名字"></div>' +
        '<div class="grid-2">' +
          '<div class="field"><label for="postSlug">链接别名（slug）</label><input class="input" id="postSlug" type="text" value="' + escAttr(slugValue(entry)) + '" placeholder="留空则自动生成"></div>' +
          '<div class="field"><label for="postDate">发布时间</label><input class="input" id="postDate" type="datetime-local" value="' + escAttr(entry ? dateToInput(parsed.fm.date) : dateToInput(new Date())) + '"></div>' +
        '</div>' +
        '<div class="field"><label>分类</label>' +
          (cats.length
            ? '<div class="chips">' + cats.map(function (c) {
                var on = selected.indexOf(c.name) >= 0;
                return '<label class="chip' + (on ? ' on' : '') + '"><input type="checkbox" class="postCat" value="' + escAttr(c.name) + '"' + (on ? ' checked' : '') + '>' + esc(c.name) + '</label>';
              }).join('') + '</div>'
            : '<p class="hint">还没有分类，可到「分类管理」中添加。</p>') +
        '</div>' +
        '<div class="field"><label for="postTags">标签</label><input class="input" id="postTags" type="text" value="' + escAttr(toArr(parsed.fm.tags).join(', ')) + '" placeholder="用逗号分隔，例如：Java, 面试"></div>' +
        '<div class="field"><label>其它</label><div class="field-row">' +
          '<label class="switch"><input type="checkbox" id="postComments"' + (parsed.fm.comments !== false ? ' checked' : '') + '>允许评论</label>' +
          '<label class="switch"><input type="checkbox" id="postSticky"' + (parsed.fm.sticky ? ' checked' : '') + '>首页置顶</label>' +
        '</div></div>' +
        '<div class="field"><label for="postCover">封面图</label>' +
          '<div class="field-row"><input class="input grow" id="postCover" type="text" value="' + escAttr(parsed.fm.cover || '') + '" placeholder="/images/uploads/xxx.jpg">' +
          '<input class="input" id="postCoverFile" type="file" accept="image/*">' +
          '<button class="btn" type="button" id="postCoverUpload">' + icon('image') + '上传</button></div>' +
          '<p class="hint">用于首页卡片的缩略图，留空则显示纯文字卡片。</p>' +
        '</div>' +
      '</div>' +
    '</div>';
    html += '<div class="editor mt-16">' +
      '<div class="editor__col"><div class="panel" id="editorPanel">' +
        '<div class="editor-bar">' + editorBarHtml() + '</div>' +
        '<textarea class="editor-textarea" id="postContent" spellcheck="false" placeholder="在这里写 Markdown 正文…">' + esc(parsed.content) + '</textarea>' +
        '<div class="editor-drop" id="editorDrop" aria-hidden="true"><span class="editor-drop__inner">' + icon('image') + '松开鼠标即可上传并插入图片</span></div>' +
        '<div class="editor__foot">' +
          '<button class="btn primary" type="button" id="savePostBtn">' + (isDraft ? '发布文章' : '保存并发布') + '</button>' +
          '<button class="btn" type="button" id="saveDraftBtn">' + (entry && !isDraft ? '转为草稿' : '存为草稿') + '</button>' +
          '<button class="btn ghost" type="button" id="cancelPostBtn">返回列表</button>' +
          '<span class="grow"></span>' +
          '<span class="hint" id="saveHint">尚未修改</span>' +
        '</div>' +
      '</div></div>' +
      '<div class="editor__col"><div class="editor__pane"><div class="panel">' +
        '<div class="panel__head"><h2>实时预览</h2><span class="tag tag--plain">Markdown</span></div>' +
        '<div class="md-preview" id="postPreview"></div>' +
      '</div></div></div>' +
    '</div>';
    view(html);
    bindEditor(entry);
    paintPreview();
    resolveDraft(entry);
  }).catch(showError);
}

function bindEditor(entry) {
  $('#postContent').addEventListener('input', onEditorInput);
  $('#cancelPostBtn').addEventListener('click', function () { navClick('#/posts'); });
  $('#savePostBtn').addEventListener('click', function () { saveEditor(entry, false); });
  $('#saveDraftBtn').addEventListener('click', function () { saveEditor(entry, true); });
  $('#metaToggle').addEventListener('click', function () {
    var body = $('#metaBody');
    var hidden = body.hasAttribute('hidden');
    if (hidden) body.removeAttribute('hidden'); else body.setAttribute('hidden', '');
    $('#metaToggle').textContent = hidden ? '收起' : '展开';
  });
  $$('.chip input', $('#metaBody')).forEach(function (input) {
    input.addEventListener('change', function () { input.parentNode.classList.toggle('on', input.checked); });
  });
  $$('.editor-bar__btn').forEach(function (b) {
    b.addEventListener('click', function () { editorAction(b.getAttribute('data-md')); });
  });
  $('#postImageFile').addEventListener('change', function () {
    var fi = $('#postImageFile');
    if (!fi.files || !fi.files.length) return;
    uploadAndInsertImages(fi.files);
    fi.value = '';
  });
  bindEditorImageDrop(entry);
  $('#postCoverUpload').addEventListener('click', function () {
    var fi = $('#postCoverFile');
    if (!fi.files || !fi.files.length) { toast('请先选择图片', true); return; }
    toast('封面上传中…');
    uploadImage(fi.files[0], 'uploads').then(function (p) {
      $('#postCover').value = p;
      toast('封面上传成功');
      onEditorInput();
    }).catch(showError);
  });
  $$('#postTitle, #postDate, #postTags, #postCover').forEach(function (el) { el.addEventListener('input', scheduleDraft); });
}

// 粘贴 / 拖拽图片：交给 GitHub API 上传后插入 Markdown
function bindEditorImageDrop() {
  var ta = $('#postContent');
  var panel = $('#editorPanel') || ta;
  var mask = $('#editorDrop');
  var depth = 0;
  function hasFiles(e) {
    var types = (e.dataTransfer && e.dataTransfer.types) || [];
    for (var i = 0; i < types.length; i++) if (types[i] === 'Files') return true;
    return false;
  }
  function setMask(on) { if (mask) mask.classList.toggle('is-on', !!on); }
  panel.addEventListener('dragenter', function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    setMask(true);
  });
  panel.addEventListener('dragover', function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });
  panel.addEventListener('dragleave', function (e) {
    if (!hasFiles(e)) return;
    depth = Math.max(0, depth - 1);
    if (!depth) setMask(false);
  });
  panel.addEventListener('drop', function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    setMask(false);
    var files = Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []);
    if (!files.some(isImageFile)) { toast('只支持上传图片文件', true); return; }
    uploadAndInsertImages(files);
  });
  ta.addEventListener('paste', function (e) {
    var cd = e.clipboardData;
    if (!cd || !cd.items) return;
    var files = [];
    for (var i = 0; i < cd.items.length; i++) {
      var it = cd.items[i];
      if (it.kind !== 'file' || !/^image\//.test(it.type || '')) continue;
      var f = it.getAsFile();
      if (f) files.push(f);
    }
    if (!files.length) return;
    e.preventDefault();
    uploadAndInsertImages(files);
  });
}

// ---------- Markdown 工具栏动作 ----------
function wrapSel(before, after, placeholder) {
  var ta = $('#postContent');
  var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
  var sel = v.slice(s, e);
  var text = sel || placeholder || '';
  ta.value = v.slice(0, s) + before + text + after + v.slice(e);
  ta.focus();
  if (sel) { ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length; }
  else { ta.selectionStart = ta.selectionEnd = s + before.length + text.length; }
  onEditorInput();
}
function prefixLines(prefix) {
  var ta = $('#postContent');
  var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
  var ls = v.lastIndexOf('\n', s - 1) + 1;
  var le = v.indexOf('\n', e);
  if (le < 0) le = v.length;
  var out = v.slice(ls, le).split('\n').map(function (l) { return l.trim() ? prefix + l : l; }).join('\n');
  ta.value = v.slice(0, ls) + out + v.slice(le);
  ta.focus();
  ta.selectionStart = ls;
  ta.selectionEnd = ls + out.length;
  onEditorInput();
}
function insertBlock(text) {
  var ta = $('#postContent');
  var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
  var prefix = (s > 0 && v.charAt(s - 1) !== '\n') ? '\n' : '';
  ta.value = v.slice(0, s) + prefix + text + v.slice(e);
  var pos = s + prefix.length + text.length;
  ta.focus();
  ta.selectionStart = ta.selectionEnd = pos;
  onEditorInput();
}
function editorAction(kind) {
  if (!$('#postContent')) return;
  if (kind === 'bold') return wrapSel('**', '**', '加粗文字');
  if (kind === 'italic') return wrapSel('*', '*', '斜体文字');
  if (kind === 'heading') return prefixLines('## ');
  if (kind === 'list') return prefixLines('- ');
  if (kind === 'ordered') return prefixLines('1. ');
  if (kind === 'quote') return prefixLines('> ');
  if (kind === 'code') return wrapSel('`', '`', 'code');
  if (kind === 'codeblock') return wrapSel('\n```\n', '\n```\n', '代码');
  if (kind === 'link') return wrapSel('[', '](https://)', '链接文字');
  if (kind === 'table') return insertBlock('| 列 1 | 列 2 |\n| --- | --- |\n| 单元格 | 单元格 |\n');
  if (kind === 'image') { $('#postImageFile').click(); return; }
}
function indent(dir) {
  var ta = $('#postContent');
  if (!ta) return;
  var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
  if (dir < 0) {
    var ls = v.lastIndexOf('\n', s - 1) + 1;
    if (v.slice(ls, ls + 2) !== '  ') return;
    ta.value = v.slice(0, ls) + v.slice(ls + 2);
    ta.selectionStart = s > ls + 2 ? s - 2 : ls;
    ta.selectionEnd = e > ls + 2 ? e - 2 : ls;
  } else {
    ta.value = v.slice(0, s) + '  ' + v.slice(e);
    ta.selectionStart = ta.selectionEnd = s + 2;
  }
  ta.focus();
  onEditorInput();
}

// ---------- 预览 / 统计 / 本地草稿 ----------
function onEditorInput() {
  state.dirty = true;
  var hint = $('#saveHint');
  if (hint) hint.innerHTML = '<span class="dirty-dot"></span>未保存的修改';
  schedulePreview();
  scheduleDraft();
}
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(paintPreview, 200);
}
function fillListCache(rows) {
  listCache = [];
  (rows || []).forEach(function (r) {
    if (!r) return;
    var entry = posts.filter(function (p) { return postPath(p.name, p.draft) === r.path; })[0];
    if (!entry) return;
    var parsed = parseFrontMatter(r.content);
    listCache.push({ file: entry.name, draft: entry.draft, sha: r.sha, content: r.content, source: r.path, fm: parsed.fm, chars: countWords(parsed.content) });
  });
  setNavCount('#navCountPosts', listCache.filter(function (i) { return !i.draft; }).length);
  return listCache;
}
function loadListCache() {
  return loadPosts().then(function () {
    return Promise.all(posts.map(function (p) { return getFile(postPath(p.name, p.draft)); }));
  }).then(fillListCache);
}

function paintPreview() {
  var ta = $('#postContent'), box = $('#postPreview');
  if (!ta || !box) return;
  var text = ta.value;
  if (!text.trim()) {
    box.innerHTML = '<p class="md-empty">还没有正文，左侧输入 Markdown 会实时显示在这里。</p>';
  } else if (typeof marked === 'undefined') {
    box.innerHTML = '<p class="hint">预览组件（marked）暂时没加载出来，先显示纯文本；正文保存不受影响。</p><pre>' + esc(text) + '</pre>';
  } else {
    box.innerHTML = renderMarkdown(text);
  }
  var stat = $('#editorStat');
  if (stat) stat.textContent = countWords(text) + ' 字 · ' + (text ? text.split('\n').length : 0) + ' 行';
}
function readDraft() {
  try {
    var d = JSON.parse(localStorage.getItem(LS_DRAFT) || 'null');
    return (d && typeof d.content === 'string') ? d : null;
  } catch (e) { return null; }
}
function writeDraft(d) { try { localStorage.setItem(LS_DRAFT, JSON.stringify(d)); } catch (e) {} }
function clearDraft() { try { localStorage.removeItem(LS_DRAFT); } catch (e) {} }
function scheduleDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(function () {
    var ta = $('#postContent');
    if (!ta) return;
    var t = $('#postTitle');
    writeDraft({ path: state.file ? (state.file.source || '') : '', title: t ? t.value : '', content: ta.value, ts: Date.now() });
  }, 600);
}
function applyDraft(d) {
  var ta = $('#postContent');
  if (!ta) return;
  ta.value = d.content;
  var t = $('#postTitle');
  if (t && d.title) t.value = d.title;
  paintPreview();
  state.dirty = true;
  var hint = $('#saveHint');
  if (hint) hint.innerHTML = '<span class="dirty-dot"></span>已恢复未保存的草稿';
}
function resolveDraft(entry) {
  var d = readDraft();
  if (!d) return;
  var sameTarget = entry ? (d.path === (entry.source || '')) : !d.path;
  if (!sameTarget) {
    toast('还有一篇未保存的草稿：' + (d.title || d.path || '新文章') + '（到「写新文章」可恢复）');
    return;
  }
  modal({
    title: '检测到未保存的草稿',
    body: '<p>上次编辑「' + esc(d.title || d.path || '新文章') + '」的内容还没有提交到 GitHub，保存于 ' + esc(fmtTime(d.ts)) + '。</p>' +
          '<p class="hint">选择「恢复草稿」会把本地内容填回编辑器。</p>',
    okText: '恢复草稿', cancelText: '丢弃'
  }).then(function (ok) {
    if (ok) applyDraft(d);
    else clearDraft();
  });
}

// ---------- 保存 ----------
function saveCurrent() { saveEditor(state.file, state.file ? !!state.file.draft : false); }

function saveEditor(entry, asDraft) {
  if (!ensureConfig()) return;
  var title = ($('#postTitle').value || '').trim();
  if (!title) { toast('请先填写标题', true); $('#postTitle').focus(); return; }
  var dateVal = $('#postDate').value;
  var slug = ($('#postSlug').value || '').trim() || slugify(title);
  var post = {
    title: title,
    date: dateVal ? dateVal.replace('T', ' ') + ':00' : nowStr(),
    categories: $$('.postCat').filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
    tags: ($('#postTags').value || '').split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean),
    comments: $('#postComments').checked,
    sticky: $('#postSticky').checked,
    cover: ($('#postCover').value || '').trim(),
    content: $('#postContent').value
  };
  var raw = buildRaw(post);
  var d = dateVal ? new Date(dateVal) : new Date();
  var fileDate = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  var fileName = asDraft ? (slug + '.md') : (fileDate + '-' + slug + '.md');
  var newPath = postPath(fileName, asDraft);
  var currentPath = entry ? postPath(entry.file, entry.draft) : null;
  var msg = (entry ? '更新' : (asDraft ? '新建草稿' : '发布文章')) + ' ' + title;
  var op;
  if (entry && currentPath !== newPath) op = moveFile(currentPath, entry.sha, newPath, msg, raw);
  else if (entry) op = putFile(newPath, raw, entry.sha, msg);
  else op = putFile(newPath, raw, null, msg);

  var btns = [$('#savePostBtn'), $('#saveDraftBtn'), $('#saveTopBtn')];
  btns.forEach(function (b) { if (b) b.disabled = true; });
  toast('正在提交到 GitHub…');
  op.then(function () {
    clearDraft();
    state.dirty = false;
    toast('已提交');
    showSync(syncPending(title));
    setHash('#/posts');
  }).catch(function (e) {
    showSync(syncFailed(e && e.message));
    showError(e);
  }).then(function () { btns.forEach(function (b) { if (b) b.disabled = false; }); });
}

// ---------- 深链打开（前台「编辑本文」） ----------
function resolveSourcePath(src) {
  var s = String(src || '').trim().replace(/^\/+/, '');
  if (/^source\//i.test(s)) s = s.slice(7);
  if (/^(_posts|_drafts)\//i.test(s)) return 'source/' + s;
  var name = s.replace(/^.*\//, '');
  if (!/\.md$/i.test(name)) name += '.md';
  return 'source/_posts/' + name;
}
function entryFromFile(f) {
  return {
    file: f.path.replace(/^source\/(_posts|_drafts)\//, ''),
    draft: /\/_drafts\//.test(f.path),
    sha: f.sha,
    content: f.content,
    source: f.path
  };
}
function openEditorBySource(src) {
  if (!ensureConfig()) return;
  var path = resolveSourcePath(src);
  var alt = path.indexOf('/_posts/') >= 0 ? path.replace('/_posts/', '/_drafts/') : path.replace('/_drafts/', '/_posts/');
  state.view = 'editor';
  state.file = null;
  setActive('editor');
  shell('正在打开文章', path.replace(/^source\//, ''));
  topActions('');
  loading('正在读取 ' + path.replace(/^source\//, '') + ' …');
  getFile(path).then(function (f) { return f || getFile(alt); }).then(function (f) {
    if (!f) throw new Error('没有找到文件：' + src);
    renderEditor(entryFromFile(f));
  }).catch(function (e) {
    toast(e && e.message ? e.message : String(e), true);
    renderPosts();
  });
}

// ---------- 分类管理 ----------
function renderCategories() {
  if (!ensureConfig()) return;
  state.view = 'categories';
  state.file = null;
  state.dirty = false;
  setActive('categories');
  if (!listCache.length) {
    loadListCache().then(function () { if (state.view === 'categories') renderCategories(); }).catch(function () {});
  }
  shell('分类管理', '分类同时作为博客顶部导航，新增后自动出现在站点导航');
  topActions('');
  loading('正在读取分类…');
  loadSiteData().then(function () {
    var cats = categoryItems();
    setNavCount('#navCountCats', cats.length);
    var used = {};
    listCache.forEach(function (i) { toArr(i.fm.categories).forEach(function (c) { used[c] = (used[c] || 0) + 1; }); });
    var html = '';
    html += '<div class="panel"><div class="panel__head"><h2>新增分类</h2></div><div class="panel__body">' +
      '<div class="field-row"><input class="input grow" id="catName" type="text" placeholder="分类名称，例如：408 笔记">' +
      '<button class="btn primary" type="button" id="addCatBtn">' + icon('plus') + '新增</button></div>' +
      '<p class="hint mt-16">首页固定保留在第一位；分类顺序决定导航顺序。</p>' +
      '</div></div>';
    html += '<div class="panel mt-16"><div class="panel__head"><h2>已有分类</h2><span class="tag tag--plain">' + cats.length + ' 个</span></div>';
    if (!cats.length) {
      html += '<p class="empty">还没有分类，先在上方添加一个。</p>';
    } else {
      html += '<div class="panel__body"><ul class="cat-list">';
      cats.forEach(function (c, i) {
        html += '<li>' +
          '<span class="cat-name">' + esc(c.name) + '</span>' +
          '<span class="cat-path">' + esc(c.path) + (used[c.name] ? ' · ' + used[c.name] + ' 篇' : ' · 暂无文章') + '</span>' +
          '<span class="cat-actions">' +
            '<button class="btn small cat-up" type="button" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' title="上移">' + icon('up') + '</button>' +
            '<button class="btn small cat-down" type="button" data-i="' + i + '"' + (i === cats.length - 1 ? ' disabled' : '') + ' title="下移">' + icon('down') + '</button>' +
            '<button class="btn small cat-rename" type="button" data-name="' + escAttr(c.name) + '">重命名</button>' +
            '<button class="btn small danger cat-del" type="button" data-name="' + escAttr(c.name) + '">删除</button>' +
          '</span></li>';
      });
      html += '</ul></div>';
    }
    html += '</div>';
    view(html);
    bindCategories(cats);
  }).catch(showError);
}

function bindCategories(cats) {
  $('#addCatBtn').addEventListener('click', function () {
    var name = ($('#catName').value || '').trim();
    if (!name) { toast('请输入分类名称', true); return; }
    if (cats.some(function (c) { return c.name === name; })) { toast('分类已存在', true); return; }
    siteData.nav.push({ name: name, path: catPath(name) });
    toast('正在提交…');
    saveSiteData('新增分类 ' + name).then(function () {
      toast('已新增分类');
      showSync(syncPending(''));
      renderCategories();
    }).catch(showError);
  });
  $$('.cat-up').forEach(function (b) { b.addEventListener('click', function () { moveCategory(cats, parseInt(b.getAttribute('data-i'), 10), -1); }); });
  $$('.cat-down').forEach(function (b) { b.addEventListener('click', function () { moveCategory(cats, parseInt(b.getAttribute('data-i'), 10), 1); }); });
  $$('.cat-rename').forEach(function (b) { b.addEventListener('click', function () { renameCategory(b.getAttribute('data-name')); }); });
  $$('.cat-del').forEach(function (b) { b.addEventListener('click', function () { deleteCategory(b.getAttribute('data-name')); }); });
}

function moveCategory(cats, index, delta) {
  var target = index + delta;
  if (target < 0 || target >= cats.length) return;
  var home = siteData.nav.filter(function (i) { return i.path === '/'; });
  var others = categoryItems();
  var tmp = others[index]; others[index] = others[target]; others[target] = tmp;
  siteData.nav = home.concat(others);
  saveSiteData('调整分类顺序').then(function () { toast('顺序已保存'); renderCategories(); }).catch(showError);
}

function renameCategory(oldName) {
  modal({
    title: '重命名分类',
    body: '<p>重命名后，所有使用该分类的文章也会一起更新。</p>',
    value: oldName, okText: '保存'
  }).then(function (newName) {
    if (!newName || newName === oldName) return null;
    if (categoryItems().some(function (c) { return c.name === newName; })) { toast('分类名已存在', true); return null; }
    siteData.nav = siteData.nav.map(function (i) { return (i.path !== '/' && i.name === oldName) ? { name: newName, path: catPath(newName) } : i; });
    toast('正在更新分类及相关文章…');
    return saveSiteData('重命名分类 ' + oldName + ' -> ' + newName)
      .then(function () { return renameCategoryInPosts(oldName, newName); })
      .then(function () { toast('重命名完成'); showSync(syncPending('')); renderCategories(); });
  }).catch(showError);
}

function renameCategoryInPosts(oldName, newName) {
  return loadPosts().then(function () {
    return Promise.all(posts.map(function (p) { return getFile(postPath(p.name, p.draft)); }));
  }).then(function (rows) {
    var chain = Promise.resolve();
    rows.forEach(function (r) {
      if (!r) return;
      var entry = posts.filter(function (p) { return postPath(p.name, p.draft) === r.path; })[0];
      if (!entry) return;
      var p = parseFrontMatter(r.content);
      var cats = toArr(p.fm.categories);
      var idx = cats.indexOf(oldName);
      if (idx >= 0) {
        cats[idx] = newName;
        var post = postFromParsed(p); post.categories = cats;
        chain = chain.then(function () { return putFile(postPath(entry.name, entry.draft), buildRaw(post), r.sha, '更新分类 ' + oldName + ' -> ' + newName); });
      }
    });
    return chain;
  });
}

function deleteCategory(name) {
  modal({
    title: '删除分类',
    body: '<p>确定删除分类「' + esc(name) + '」吗？</p><p class="hint">相关文章里的这个分类会被移除，文章本身保留。</p>',
    okText: '删除', danger: true
  }).then(function (ok) {
    if (!ok) return null;
    siteData.nav = siteData.nav.filter(function (i) { return i.path === '/' || i.name !== name; });
    toast('正在删除分类并更新相关文章…');
    return saveSiteData('删除分类 ' + name)
      .then(function () { return removeCategoryFromPosts(name); })
      .then(function () { toast('删除完成'); showSync(syncPending('')); renderCategories(); });
  }).catch(showError);
}

function removeCategoryFromPosts(name) {
  return loadPosts().then(function () {
    return Promise.all(posts.map(function (p) { return getFile(postPath(p.name, p.draft)); }));
  }).then(function (rows) {
    var chain = Promise.resolve();
    rows.forEach(function (r) {
      if (!r) return;
      var entry = posts.filter(function (p) { return postPath(p.name, p.draft) === r.path; })[0];
      if (!entry) return;
      var p = parseFrontMatter(r.content);
      var cats = toArr(p.fm.categories);
      if (cats.indexOf(name) >= 0) {
        var post = postFromParsed(p);
        post.categories = cats.filter(function (c) { return c !== name; });
        chain = chain.then(function () { return putFile(postPath(entry.name, entry.draft), buildRaw(post), r.sha, '移除分类 ' + name); });
      }
    });
    return chain;
  });
}

// ---------- 作业文档（.docx 的生成 / 上传 / 管理） ----------
// 文件提交到 source/files/homework/，清单提交到 source/_data/homework.json；
// 浏览端 /homework/ 按上传时间倒序列出，读者下载前填姓名 / 学号 / 班级，
// 前台脚本把文档里的占位符替换掉，再以「姓名 + 学号 + 原文件名」保存。
function hwDocx() { return window.__CHEN_DOCX__ || null; }
function hwDocs() {
  var list = (hwData && Array.isArray(hwData.docs)) ? hwData.docs.slice() : [];
  return list.sort(function (a, b) { return new Date((b && b.date) || 0) - new Date((a && a.date) || 0); });
}
function hwDoc(id) {
  var list = (hwData && Array.isArray(hwData.docs)) ? hwData.docs : [];
  return list.filter(function (d) { return String(d.id) === String(id); })[0] || null;
}
function hwBindClick(id, fn) {
  var el = $('#' + id);
  if (el) el.addEventListener('click', fn);
}
function loadHomework() {
  return getFile(HOMEWORK_DATA).then(function (f) {
    var data = null;
    if (f && f.content) { try { data = JSON.parse(f.content); } catch (e) { data = null; } }
    if (!data || typeof data !== 'object') data = {};
    if (!Array.isArray(data.docs)) data.docs = [];
    hwData = data;
    setNavCount('#navCountDocs', data.docs.length);
    return hwData;
  });
}
function saveHomework(msg) {
  var body = { message: msg || '更新作业文档列表', content: b64encode(JSON.stringify(hwData, null, 2) + '\n'), branch: cfg.branch || 'main' };
  return gh('GET', HOMEWORK_DATA).then(function (f) { if (f) body.sha = f.sha; return gh('PUT', HOMEWORK_DATA, body); });
}
function hwSizeText(bytes) {
  var n = Number(bytes) || 0;
  if (n <= 0) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
// 仓库里的路径 = 站点路径前面加 source/（/files/homework/x.docx → source/files/homework/x.docx）
function hwRepoPath(urlPath) {
  var p = String(urlPath || '');
  if (!p) return '';
  return 'source' + (p.charAt(0) === '/' ? p : '/' + p);
}
// 存进仓库的文件名：时间戳 + 安全名，和图片上传同一套命名习惯
function hwStoredName(filename) {
  var base = String(filename || 'homework').replace(/\.[^.]*$/, '')
    .replace(/[^\w\u4e00-\u9fff.\-]+/g, '-').replace(/^-+|-+$/g, '');
  return Date.now() + '-' + (base || 'homework') + '.docx';
}
function hwFileToBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(String(reader.result).split(',')[1] || ''); };
    reader.onerror = function () { reject(new Error('读取文件失败')); };
    reader.readAsDataURL(file);
  });
}
function hwBase64ToBytes(base64) {
  var bin = atob(String(base64 || ''));
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}
function hwBytesToBase64(bytes) {
  var bin = '';
  var chunk = 0x8000;
  for (var i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
function hwInfoOf(bytes) {
  var dx = hwDocx();
  return dx && bytes ? dx.inspect(bytes, window.fflate) : null;
}
function hwPlaceholderTags(entry) {
  var list = entry && entry.placeholders;
  if (!Array.isArray(list) || !list.length) return '<span class="tag tag--warn">未检测到</span>';
  return list.map(function (label) { return '<span class="tag tag--ok">' + esc(label) + '</span>'; }).join(' ');
}
function hwPickFile() {
  var input = $('#hwFile');
  return (input && input.files && input.files.length) ? input.files[0] : null;
}
// 表单里的三个值：显示名称 / 原文件名 / 正文
function hwFormMeta() {
  var title = ($('#hwTitle') ? $('#hwTitle').value : '').trim();
  var filename = ($('#hwFilename') ? $('#hwFilename').value : '').trim();
  if (!filename) filename = (title || '作业文档').replace(/[\\/:*?"<>|]/g, '') + '.docx';
  if (!/\.docx$/i.test(filename)) filename += '.docx';
  return { title: title, filename: filename, body: $('#hwBody') ? $('#hwBody').value : '' };
}
function hwReadFile(file) {
  if (!file) return Promise.reject(new Error('请先选择文件'));
  if (!/\.docx$/i.test(file.name || '')) return Promise.reject(new Error('只支持 .docx，请先在 Word 里另存为 .docx'));
  if (file.size > HOMEWORK_MAX_BYTES) return Promise.reject(new Error('文件超过 20MB，请压缩后再传'));
  return hwFileToBase64(file).then(function (base64) {
    var bytes = hwBase64ToBytes(base64);
    return { bytes: bytes, base64: base64, info: hwInfoOf(bytes) };
  });
}
function hwPutDocx(path, base64, message) {
  var repoPath = hwRepoPath(path);
  return gh('GET', repoPath).then(function (f) {
    var body = { message: message, content: base64, branch: cfg.branch || 'main' };
    if (f) body.sha = f.sha;
    return gh('PUT', repoPath, body);
  });
}
function hwDownloadBytes(bytes, filename) {
  var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
}
// 新建、替换文件、重新生成都走这里：先提交 .docx，再更新清单
function hwSubmitDocx(o) {
  if (!hwData || !Array.isArray(hwData.docs)) {
    return Promise.reject(new Error('文档列表还没读出来，请返回列表刷新后再试'));
  }
  var info = hwInfoOf(o.bytes);
  var entry = {
    id: String(o.id || Date.now()),
    title: o.title || o.filename,
    filename: o.filename,
    path: o.path,
    size: o.bytes ? o.bytes.length : 0,
    date: o.date || new Date().toISOString(),
    origin: o.origin === 'generated' ? 'generated' : 'upload',
    hasPlaceholder: !!(info && info.total),
    placeholders: info ? info.found : []
  };
  if (entry.origin === 'generated') entry.body = o.body || '';
  var label = (o.id ? '更新作业文档 ' : '添加作业文档 ') + entry.filename;
  toast('正在提交到 GitHub…');
  return hwPutDocx(o.path, o.base64, label).then(function () {
    var list = hwData.docs.filter(function (d) { return String(d.id) !== entry.id; });
    list.push(entry);
    hwData.docs = list;
    setNavCount('#navCountDocs', list.length);
    return saveHomework(label);
  }).then(function () { return entry; });
}

function renderHomework(params) {
  if (!ensureConfig()) return;
  var p = params || {};
  if (p.doc) {
    state.view = 'homework';
    loading('正在读取文档信息…');
    (hwData ? Promise.resolve(hwData) : loadHomework()).then(function () {
      var doc = hwDoc(p.doc);
      if (!doc) { toast('找不到这份文档', true); setHash('#/homework'); return; }
      renderHomeworkForm('edit', doc);
    }).catch(showError);
    return;
  }
  if (p.new || p.upload) {
    var mode = p.new ? 'new' : 'upload';
    loading('正在读取文档列表…');
    loadHomework().then(function () { renderHomeworkForm(mode, null); }).catch(showError);
    return;
  }

  state.view = 'homework';
  state.file = null;
  state.dirty = false;
  setActive('homework');
  shell('作业文档', '在线生成或上传 .docx，读者在 /homework/ 下载时自动替换姓名 / 学号 / 班级');
  topActions('<button class="btn" type="button" id="hwNewBtn">' + icon('plus') + '在线生成</button>' +
    '<button class="btn" type="button" id="hwUploadBtn">' + icon('upload') + '上传 .docx</button>');
  loading('正在读取文档列表…');

  loadHomework().then(function () {
    var docs = hwDocs();
    var html = '<div class="toolbar">' +
      '<button class="btn primary" type="button" id="hwNewBtn2">' + icon('plus') + '在线生成文档</button>' +
      '<button class="btn" type="button" id="hwUploadBtn2">' + icon('upload') + '上传 .docx</button>' +
      '<span class="hint" style="margin-left:auto">共 ' + docs.length + ' 份 · 浏览端按上传时间倒序展示</span>' +
      '</div>';
    if (!docs.length) {
      html += '<p class="empty">还没有文档。<br>可以「在线生成」一份带占位符的文档，也可以把 Word 里排好版的 .docx 传上来。</p>';
    } else {
      html += '<div class="panel"><div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>文档</th><th>原文件名</th><th>大小</th><th>占位符</th><th>时间</th><th class="td-actions">操作</th>' +
        '</tr></thead><tbody>';
      docs.forEach(function (doc) {
        html += '<tr data-id="' + escAttr(doc.id) + '">' +
          '<td class="td-title"><span title="' + escAttr(doc.title || '') + '">' + esc(doc.title || '未命名文档') + '</span>' +
            '<span class="cat-path">' + esc(doc.path || '') + '</span></td>' +
          '<td class="td-mono">' + esc(doc.filename || '') + '</td>' +
          '<td class="td-mono">' + hwSizeText(doc.size) + '</td>' +
          '<td>' + hwPlaceholderTags(doc) + '</td>' +
          '<td class="td-mono">' + esc(fmtTime(doc.date)) + '</td>' +
          '<td class="td-actions">' +
            '<button class="btn small" type="button" data-act="file">' + icon('eye') + '原文件</button>' +
            '<button class="btn small" type="button" data-act="edit">' + icon('edit') + '编辑</button>' +
            '<button class="btn small danger" type="button" data-act="del">' + icon('trash') + '删除</button>' +
          '</td></tr>';
      });
      html += '</tbody></table></div></div>';
    }
    view(html);
    bindHomework(docs);
  }).catch(showError);
}

function bindHomework(docs) {
  var byId = {};
  docs.forEach(function (d) { byId[String(d.id)] = d; });
  var openNew = function () { navClick('#/homework?new=1'); };
  var openUpload = function () { navClick('#/homework?upload=1'); };
  hwBindClick('hwNewBtn', openNew);
  hwBindClick('hwNewBtn2', openNew);
  hwBindClick('hwUploadBtn', openUpload);
  hwBindClick('hwUploadBtn2', openUpload);

  $$('.table tbody tr[data-id]').forEach(function (tr) {
    var doc = byId[tr.getAttribute('data-id')];
    if (!doc) return;
    var open = function () { navClick('#/homework?doc=' + encodeURIComponent(doc.id)); };
    tr.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-act]')) return;
      open();
    });
    $$('[data-act]', tr).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var act = btn.getAttribute('data-act');
        if (act === 'edit') { open(); return; }
        if (act === 'del') { hwDelete(doc); return; }
        if (act === 'file') { window.open(siteOrigin() + publicUrl(doc.path), '_blank', 'noopener'); }
      });
    });
  });
}

function renderHomeworkForm(mode, doc) {
  if (!ensureConfig()) return;
  if (mode === 'edit' && !doc) { toast('找不到这份文档', true); setHash('#/homework'); return; }
  var isNew = mode === 'new';
  var isUpload = mode === 'upload';
  var generated = !!(doc && doc.origin === 'generated');
  var title = isNew ? '在线生成文档' : (isUpload ? '上传 .docx' : '编辑文档');

  state.view = 'homework';
  state.file = null;
  state.dirty = false;
  setActive('homework');
  shell(title, isNew ? '填标题与正文，浏览器直接生成 .docx（学院风排版）'
    : (isUpload ? '把 Word 里做好的 .docx 传上来' : '改信息、用正文重新生成或替换文件'));
  topActions('<button class="btn" type="button" id="hwBackBtn">' + icon('back') + '返回列表</button>');

  var html = '<div class="panel"><div class="panel__head"><h2>' + esc(title) + '</h2></div><div class="panel__body">';
  if (isUpload) {
    html += '<div class="field"><label for="hwFile">选择 .docx 文件（≤ 20MB）</label>' +
      '<input class="input" id="hwFile" type="file" accept=".docx"></div>';
  }
  html += '<div class="grid-2">' +
    '<div class="field"><label for="hwTitle">列表里显示的名称</label>' +
      '<input class="input" id="hwTitle" type="text" value="' + escAttr(doc ? doc.title : '') + '" placeholder="例如：作业一 · 需求分析"></div>' +
    '<div class="field"><label for="hwFilename">原文件名（含后缀）</label>' +
      '<input class="input" id="hwFilename" type="text" value="' + escAttr(doc ? doc.filename : '') + '" placeholder="例如：软件工程作业一.docx">' +
      '<p class="hint">读者下载时是「姓名 + 学号 + 这个文件名」。</p></div>' +
    '</div>';
  if (!isUpload) {
    if (mode === 'edit' && !generated) {
      html += '<div class="field"><p class="hint">这份文档是直接上传的 .docx，正文不在这里编辑；要改内容请用下面的「替换文件」，或者删掉重新上传。</p></div>';
    } else {
      html += '<div class="field"><label for="hwBody">正文</label>' +
        '<textarea class="textarea" id="hwBody" spellcheck="false" style="min-height:320px" placeholder="在这里写文档内容…">' +
        esc(doc && doc.body ? doc.body : '') + '</textarea>' +
        '<p class="hint">占位符直接写在正文里：<code>xingming</code> 姓名、<code>xuehao</code> 学号、<code>banji</code> 班级，读者下载时会被替换成他填写的内容。<br>' +
        '支持：# / ## / ### 标题、- 无序列表、1. 有序列表、空行分段、**加粗**；表格、图片请用 Word 做好后上传。</p></div>';
    }
  }
  if (mode === 'edit') {
    html += '<div class="field"><label for="hwFile">替换文件（可选，选了就会覆盖仓库里的那份 .docx）</label>' +
      '<input class="input" id="hwFile" type="file" accept=".docx"></div>';
  }
  html += '<div class="field-row">';
  if (isNew || (mode === 'edit' && generated)) {
    html += '<button class="btn" type="button" id="hwPreviewBtn">' + icon('eye') + '本地预览</button>';
  }
  if (mode === 'edit') {
    html += '<button class="btn" type="button" id="hwMetaBtn">' + icon('save') + '只保存信息</button>';
  }
  html += '<span class="grow"></span>' +
    '<button class="btn primary" type="button" id="hwSubmitBtn">' + icon('save') +
    (isNew ? '生成并提交' : (isUpload ? '上传并提交' : (generated ? '用正文重新生成' : '替换文件并保存'))) +
    '</button></div>';
  html += '</div></div>';
  view(html);
  bindHomeworkForm(mode, doc, generated);
}

function bindHomeworkForm(mode, doc, generated) {
  hwBindClick('hwBackBtn', function () { navClick('#/homework'); });
  hwBindClick('hwPreviewBtn', function () {
    var dx = hwDocx();
    if (!dx) { toast('生成组件没加载成功，请刷新页面重试', true); return; }
    var meta = hwFormMeta();
    if (!meta.title) { toast('请先填写文档标题', true); return; }
    try {
      hwDownloadBytes(dx.build(meta.title, meta.body, window.fflate, { author: HOMEWORK_AUTHOR }), meta.filename);
      toast('已下载本地预览，确认排版后再提交');
    } catch (e) { showError(e); }
  });
  hwBindClick('hwMetaBtn', function () { hwSaveMeta(doc); });
  hwBindClick('hwSubmitBtn', function () {
    if (mode === 'new') { hwCreateFromForm(); return; }
    if (mode === 'upload') { hwUploadNew(); return; }
    hwSaveEdited(doc, generated);
  });
}

function hwCreateFromForm() {
  var dx = hwDocx();
  if (!dx) { toast('生成组件没加载成功，请刷新页面重试', true); return; }
  var meta = hwFormMeta();
  if (!meta.title) { toast('请先填写文档标题', true); if ($('#hwTitle')) $('#hwTitle').focus(); return; }
  var bytes;
  try {
    bytes = dx.build(meta.title, meta.body, window.fflate, { author: HOMEWORK_AUTHOR });
  } catch (e) { showError(e); return; }
  hwSubmitDocx({
    title: meta.title, filename: meta.filename, body: meta.body, origin: 'generated',
    bytes: bytes, base64: hwBytesToBase64(bytes), path: HOMEWORK_URL_BASE + hwStoredName(meta.filename)
  }).then(function (entry) {
    toast(entry.hasPlaceholder ? '已提交：' + entry.filename : '已提交（正文里没找到占位符）：' + entry.filename);
    showSync(syncPending(''));
    setHash('#/homework');
  }).catch(showError);
}

function hwUploadNew() {
  var file = hwPickFile();
  if (!file) { toast('请先选择 .docx 文件', true); return; }
  toast('正在读取文件…');
  hwReadFile(file).then(function (out) {
    var meta = hwFormMeta();
    if (!meta.title) meta.title = String(file.name).replace(/\.[^.]*$/, '');
    return hwSubmitDocx({
      title: meta.title, filename: meta.filename, origin: 'upload',
      bytes: out.bytes, base64: out.base64, path: HOMEWORK_URL_BASE + hwStoredName(meta.filename)
    });
  }).then(function (entry) {
    toast(entry.hasPlaceholder ? '已提交：' + entry.filename : '已提交（未检测到占位符）：' + entry.filename);
    showSync(syncPending(''));
    setHash('#/homework');
  }).catch(showError);
}

function hwSaveMeta(doc) {
  if (!doc) return;
  var meta = hwFormMeta();
  doc.title = meta.title || doc.title;
  doc.filename = meta.filename;
  if (doc.origin === 'generated') doc.body = meta.body;
  toast('正在保存…');
  saveHomework('更新作业文档信息 ' + doc.filename).then(function () {
    toast('已保存');
    showSync(syncPending(''));
    setHash('#/homework');
  }).catch(showError);
}

function hwSaveEdited(doc, generated) {
  if (!doc) return;
  var meta = hwFormMeta();
  var file = hwPickFile();
  var step;
  if (file) {
    step = hwReadFile(file).then(function (out) {
      return { bytes: out.bytes, base64: out.base64, origin: 'upload', body: '' };
    });
  } else if (generated) {
    var dx = hwDocx();
    if (!dx) { toast('生成组件没加载成功，请刷新页面重试', true); return; }
    var bytes;
    try {
      bytes = dx.build(meta.title, meta.body, window.fflate, { author: HOMEWORK_AUTHOR });
    } catch (e) { showError(e); return; }
    step = Promise.resolve({ bytes: bytes, base64: hwBytesToBase64(bytes), origin: 'generated', body: meta.body });
  } else {
    toast('这份文档是上传的 .docx，请先选择要替换的文件', true);
    return;
  }
  step.then(function (out) {
    return hwSubmitDocx({
      id: doc.id, date: doc.date, path: doc.path,
      title: meta.title || doc.title, filename: meta.filename,
      origin: out.origin, body: out.body, bytes: out.bytes, base64: out.base64
    });
  }).then(function (entry) {
    toast('已更新：' + entry.filename);
    showSync(syncPending(''));
    setHash('#/homework');
  }).catch(showError);
}

function hwDelete(doc) {
  if (!doc) return;
  modal({
    title: '删除文档',
    body: '<p>确定删除「' + esc(doc.title || doc.filename) + '」吗？</p>' +
      '<p class="hint">仓库里的 .docx 与列表记录都会被删除，该操作不可撤销。</p>',
    okText: '删除', danger: true
  }).then(function (ok) {
    if (!ok) return null;
    var path = hwRepoPath(doc.path);
    var label = '删除作业文档 ' + (doc.filename || doc.id);
    toast('正在删除…');
    return getFile(path).then(function (f) {
      return f ? deleteFile(path, f.sha, label) : null;
    }).then(function () {
      hwData.docs = hwData.docs.filter(function (d) { return String(d.id) !== String(doc.id); });
      setNavCount('#navCountDocs', hwData.docs.length);
      return saveHomework(label);
    }).then(function () {
      toast('已删除');
      showSync(syncPending(''));
      route();
    });
  }).catch(showError);
}

// ---------- 站点设置 ----------
function renderSite() {
  if (!ensureConfig()) return;
  state.view = 'site';
  state.file = null;
  state.dirty = false;
  setActive('site');
  shell('站点设置', '首页标题与简介、用户端背景图与站点根路径');
  topActions('');
  loading('正在读取站点设置…');
  loadSiteData().then(function () {
    var bg = siteData.background || '';
    var hero = siteData.hero || {};
    var html = '<div class="panel"><div class="panel__head"><h2>首页标题与简介</h2></div><div class="panel__body">' +
      '<div class="field"><label for="heroTitle">首页标题</label>' +
        '<input class="input" id="heroTitle" type="text" value="' + escAttr(hero.title || '') + '" placeholder="408 笔记 · 语言总结 · 面试复盘">' +
      '</div>' +
      '<div class="field"><label for="heroDesc">首页简介</label>' +
        '<textarea class="textarea" id="heroDesc" rows="3" placeholder="把零散的知识点写成自己的体系：……">' + esc(hero.desc || '') + '</textarea>' +
        '<p class="hint">显示在首页顶部字标下方的大标题与一段介绍。标题留空用主题默认文案，简介留空则整段不显示；保存后约 1-2 分钟线上生效。</p>' +
      '</div>' +
      '<button class="btn primary" type="button" id="saveHeroBtn">' + icon('save') + '保存</button>' +
      '</div></div>';
    html += '<div class="grid-2" style="margin-top:16px">';
    html += '<div class="panel"><div class="panel__head"><h2>用户端背景图</h2></div><div class="panel__body">' +
      '<div class="bg-preview" style="' + (bg ? 'background-image:url(' + escAttr(bg) + ')' : '') + '"></div>' +
      '<p class="hint">当前：' + esc(bg || '未设置（使用默认渐变背景）') + '</p>' +
      '<div class="field mt-16"><label for="bgFile">上传新背景</label>' +
        '<div class="field-row"><input class="input grow" id="bgFile" type="file" accept="image/*">' +
        '<button class="btn primary" type="button" id="bgUploadBtn">' + icon('image') + '上传并应用</button></div>' +
      '</div>' +
      '<div class="field"><label for="bgUrl">或直接填写图片地址</label>' +
        '<div class="field-row"><input class="input grow" id="bgUrl" type="text" placeholder="/images/background/xxx.jpg">' +
        '<button class="btn" type="button" id="bgUrlBtn">使用该地址</button></div>' +
      '</div>' +
      '<button class="btn" type="button" id="bgClearBtn">恢复默认背景</button>' +
      '</div></div>';
    html += '<div class="panel"><div class="panel__head"><h2>站点根路径</h2></div><div class="panel__body">' +
      '<div class="field"><label for="siteBase">根路径</label><input class="input" id="siteBase" type="text" value="' + escAttr(cfg.siteBase || '/') + '">' +
      '<p class="hint">用户主页填 /，项目主页填 /仓库名/。只影响后台插入的图片地址，不影响主题导航。</p></div>' +
      '<button class="btn primary" type="button" id="saveSiteBaseBtn">' + icon('save') + '保存</button>' +
      '</div></div>';
    html += '</div>';
    view(html);
    bindSite();
  }).catch(showError);
}

function bindSite() {
  $('#saveHeroBtn').addEventListener('click', function () {
    siteData.hero = {
      title: ($('#heroTitle').value || '').trim(),
      desc: ($('#heroDesc').value || '').trim()
    };
    saveSiteData('更新首页标题与简介').then(function () {
      toast('首页文案已更新');
      showSync(syncPending(''));
      renderSite();
    }).catch(showError);
  });
  $('#bgUploadBtn').addEventListener('click', function () {
    var fi = $('#bgFile');
    if (!fi.files || !fi.files.length) { toast('请先选择图片', true); return; }
    toast('上传中…');
    uploadImage(fi.files[0], 'background').then(function (p) {
      siteData.background = p;
      return saveSiteData('更新背景图片');
    }).then(function () {
      toast('背景已更新');
      showSync(syncPending(''));
      renderSite();
    }).catch(showError);
  });
  $('#bgUrlBtn').addEventListener('click', function () {
    var u = ($('#bgUrl').value || '').trim();
    if (!u) { toast('请输入图片地址', true); return; }
    siteData.background = u;
    saveSiteData('更新背景图片').then(function () {
      toast('背景已更新');
      showSync(syncPending(''));
      renderSite();
    }).catch(showError);
  });
  $('#bgClearBtn').addEventListener('click', function () {
    siteData.background = '';
    saveSiteData('恢复默认背景').then(function () { toast('已恢复默认背景'); renderSite(); }).catch(showError);
  });
  $('#saveSiteBaseBtn').addEventListener('click', function () {
    cfg.siteBase = ($('#siteBase').value || '').trim() || '/';
    saveConfig();
    toast('站点根路径已保存');
  });
}

// ---------- 账号设置 ----------
function renderSettings() {
  state.view = 'settings';
  state.file = null;
  state.dirty = false;
  setActive('settings');
  shell('账号设置', '通过 GitHub API 直接读写博客仓库');
  topActions('');
  var html = '<div class="panel"><div class="panel__head"><h2>仓库连接</h2>' +
    '<span class="tag ' + (hasConfig() ? 'tag--ok' : 'tag--warn') + '">' + (hasConfig() ? '已配置' : '未配置') + '</span></div>' +
    '<div class="panel__body">' +
    '<div class="field"><label for="cfgToken">GitHub Token（需要仓库 Contents 读写权限）</label>' +
      '<input class="input" id="cfgToken" type="password" value="' + escAttr(cfg.token || '') + '" placeholder="github_pat_xxx 或 ghp_xxx"></div>' +
    '<div class="grid-2">' +
      '<div class="field"><label for="cfgOwner">用户名 / 组织名</label><input class="input" id="cfgOwner" type="text" value="' + escAttr(cfg.owner || '') + '" placeholder="ChenCoder23"></div>' +
      '<div class="field"><label for="cfgRepo">仓库名</label><input class="input" id="cfgRepo" type="text" value="' + escAttr(cfg.repo || '') + '" placeholder="ChenCoder23.github.io"></div>' +
      '<div class="field"><label for="cfgBranch">分支</label><input class="input" id="cfgBranch" type="text" value="' + escAttr(cfg.branch || 'main') + '"></div>' +
      '<div class="field"><label for="cfgBase">站点根路径</label><input class="input" id="cfgBase" type="text" value="' + escAttr(cfg.siteBase || '/') + '" placeholder="/ 或 /仓库名/"></div>' +
    '</div>' +
    '<div class="field-row"><button class="btn primary" type="button" id="saveCfgBtn">' + icon('save') + '保存</button>' +
      '<button class="btn" type="button" id="testCfgBtn">测试连接</button></div>' +
    '<p class="hint mt-16">Token 只保存在当前浏览器的 localStorage 中，不会上传到任何服务器。后台保存 = 提交一次 commit，GitHub Actions 会自动重新构建并发布，约 1-2 分钟后线上生效。</p>' +
    '</div></div>';
  view(html);
  bindSettings();
}

function bindSettings() {
  function readForm() {
    cfg.token = ($('#cfgToken').value || '').trim();
    cfg.owner = ($('#cfgOwner').value || '').trim();
    cfg.repo = ($('#cfgRepo').value || '').trim();
    cfg.branch = ($('#cfgBranch').value || '').trim() || 'main';
    cfg.siteBase = ($('#cfgBase').value || '').trim() || '/';
    saveConfig();
  }
  $('#saveCfgBtn').addEventListener('click', function () {
    readForm();
    toast('已保存');
    renderPosts();
  });
  $('#testCfgBtn').addEventListener('click', function () {
    readForm();
    showSync({ ok: null, title: '正在测试连接…', desc: cfg.owner + '/' + cfg.repo + ' @ ' + cfg.branch });
    gh('GET', 'source/_data/site.json').then(function () {
      showSync({ ok: true, title: '连接成功', desc: '已能读取 ' + cfg.owner + '/' + cfg.repo + ' 的内容' });
    }).catch(function (e) {
      showSync(syncFailed(e && e.message));
      showError(e);
    });
  });
}

// ---------- 快捷键 ----------
function bindShortcuts() {
  document.addEventListener('keydown', function (e) {
    var ta = $('#postContent');
    if (!ta) return;
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveCurrent(); return; }
    if (document.activeElement !== ta) return;
    if (mod && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); editorAction('bold'); return; }
    if (mod && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); editorAction('italic'); return; }
    if (mod && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); editorAction('link'); return; }
    if (e.key === 'Tab') { e.preventDefault(); indent(e.shiftKey ? -1 : 1); }
  });
  document.addEventListener('chen:libs', function () { paintPreview(); });
  window.addEventListener('beforeunload', function (e) {
    if (!state.dirty) return undefined;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });
  window.addEventListener('hashchange', onHashChange);
}

// ---------- 启动 ----------
function readQuery(name) {
  try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
}
function init() {
  $$('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () { navClick(b.getAttribute('data-href') || '#/posts'); });
  });
  bindShortcuts();
  var deep = readQuery('edit');
  if (deep) {
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    if (!hasConfig()) { renderSettings(); toast('请先在「账号设置」中填写 Token，再打开编辑链接', true); return; }
    setHash('#/editor?file=' + encodeURIComponent(deep));
    return;
  }
  if (!hasConfig()) { renderSettings(); toast('请先完成账号设置'); return; }
  loadHomework().catch(function () { /* 读不到就先不显示数量，不影响其它视图 */ });
  if (!location.hash) { setHash('#/posts'); return; }
  route();
}

init();
})();
