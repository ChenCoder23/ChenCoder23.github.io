(function () {
'use strict';

var LS_KEY = 'chenblog-admin-v1';
var API = 'https://api.github.com';
var DEFAULT_CFG = { owner: 'ChenCoder23', repo: 'ChenCoder23.github.io', branch: 'main', siteBase: '/' };

var cfg = loadConfig();
var siteData = null;
var posts = [];

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
function dateToInput(d) {
  if (!d) return '';
  if (d instanceof Date) return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  return String(d).replace(' ', 'T').slice(0, 16);
}
function toArr(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
function insertAtCursor(ta, text) {
  var start = ta.selectionStart || 0, end = ta.selectionEnd || 0;
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = start + text.length;
}
function publicUrl(sitePath) { var base = (cfg.siteBase || '/').replace(/\/+$/, ''); return base + sitePath; }

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

// ---------- 站点数据（背景图 + 导航分类） ----------
function defaultSiteData() { return { background: '', nav: [{ name: '首页', path: '/' }] }; }
function loadSiteData() {
  return getFile('source/_data/site.json').then(function (f) {
    if (!f) { siteData = defaultSiteData(); return siteData; }
    try { siteData = JSON.parse(f.content); } catch (e) { siteData = defaultSiteData(); }
    if (!Array.isArray(siteData.nav)) siteData.nav = defaultSiteData().nav;
    if (typeof siteData.background !== 'string') siteData.background = '';
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
function buildRaw(p) {
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

function uploadImage(file, folder) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function () { reject(new Error('读取文件失败')); };
    reader.readAsDataURL(file);
  }).then(function (dataUrl) {
    var base64 = dataUrl.split(',')[1] || '';
    if (!base64) throw new Error('图片数据为空');
    var safe = file.name.replace(/[^\w.\-]+/g, '-');
    var name = Date.now() + '-' + safe;
    var path = 'source/images/' + folder + '/' + name;
    return gh('PUT', path, { message: '上传图片 ' + name, content: base64, branch: cfg.branch || 'main' }).then(function () {
      return '/images/' + folder + '/' + name;
    });
  });
}

// ---------- 视图切换 ----------
function setActive(view) { $$('.nav-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === view); }); }
function ensureConfig() { if (!cfg.token || !cfg.owner || !cfg.repo) { renderSettings(); toast('请先完成账号设置', true); return false; } return true; }
function showError(e) { console.error(e); toast(e && e.message ? e.message : String(e), true); }

// ---------- 文章管理 ----------
function renderPosts() {
  if (!ensureConfig()) return;
  setActive('posts');
  $('#content').innerHTML = '<h1>文章管理</h1><p class="hint">加载中…</p>';
  loadPosts().then(function () {
    var jobs = posts.map(function (p) { return getFile(postPath(p.name, p.draft)); });
    return Promise.all(jobs);
  }).then(function (rows) {
    var html = '<h1>文章管理</h1><button class="btn primary" id="newPostBtn">+ 新建文章</button>';
    if (!rows.length) { html += '<p class="empty">暂无文章。</p>'; $('#content').innerHTML = html; var nb = $('#newPostBtn'); if (nb) nb.addEventListener('click', function () { renderEditor(null); }); return; }
    html += '<table class="table"><thead><tr><th>标题</th><th>状态</th><th>分类</th><th>日期</th><th>评论</th><th>操作</th></tr></thead><tbody>';
    var cache = {};
    rows.forEach(function (r) {
      var entry = posts.filter(function (p) { return postPath(p.name, p.draft) === r.path; })[0];
      var name = entry.name, draft = entry.draft;
      var p = parseFrontMatter(r.content);
      cache[name + '|' + draft] = { file: name, sha: r.sha, content: r.content, draft: draft };
      var cats = toArr(p.fm.categories).join('、');
      html += '<tr>';
      html += '<td>' + esc(p.fm.title || name) + (p.fm.sticky ? ' <span class="badge">置顶</span>' : '') + '</td>';
      html += '<td>' + (draft ? '<span class="status draft">草稿</span>' : '<span class="status pub">已发布</span>') + '</td>';
      html += '<td>' + esc(cats) + '</td><td>' + esc(fmtDate(p.fm.date)) + '</td><td>' + (p.fm.comments !== false ? '允许' : '关闭') + '</td>';
      html += '<td class="actions">';
      html += '<button class="btn small edit" data-key="' + esc(name + '|' + draft) + '">编辑</button> ';
      html += '<button class="btn small toggle" data-key="' + esc(name + '|' + draft) + '">' + (draft ? '发布' : '转草稿') + '</button> ';
      html += '<button class="btn small danger del" data-key="' + esc(name + '|' + draft) + '">删除</button>';
      html += '</td></tr>';
    });
    html += '</tbody></table>';
    $('#content').innerHTML = html;
    bindPosts(cache);
  }).catch(showError);
}

function bindPosts(cache) {
  var nb = $('#newPostBtn'); if (nb) nb.addEventListener('click', function () { renderEditor(null); });
  $$('.edit').forEach(function (btn) { btn.addEventListener('click', function () { renderEditor(cache[btn.getAttribute('data-key')]); }); });
  $$('.toggle').forEach(function (btn) { btn.addEventListener('click', function () { toggleDraft(cache[btn.getAttribute('data-key')]); }); });
  $$('.del').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-key');
      var c = cache[key];
      if (!c) return;
      if (!confirm('确定删除文章「' + c.file + '」吗？此操作不可恢复。')) return;
      deleteFile(postPath(c.file, c.draft), c.sha, '删除文章 ' + c.file)
        .then(function () { toast('已删除，等待 GitHub Actions 重新构建'); renderPosts(); })
        .catch(showError);
    });
  });
}

function toggleDraft(entry) {
  var p = parseFrontMatter(entry.content);
  var raw = buildRaw(postFromParsed(p));
  if (entry.draft) {
    var date = fmtDate(p.fm.date) || todayStr();
    var slug = entry.file.replace(/\.md$/i, '');
    var newName = date + '-' + slug + '.md';
    moveFile(postPath(entry.file, true), entry.sha, postPath(newName, false), '发布草稿 ' + slug, raw)
      .then(function () { toast('已发布，等待构建'); renderPosts(); }).catch(showError);
  } else {
    var slug2 = entry.file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/i, '');
    var newName2 = slug2 + '.md';
    moveFile(postPath(entry.file, false), entry.sha, postPath(newName2, true), '转为草稿 ' + slug2, raw)
      .then(function () { toast('已转为草稿，等待构建'); renderPosts(); }).catch(showError);
  }
}

// ---------- 文章编辑 ----------
function renderEditor(existing) {
  if (!ensureConfig()) return;
  setActive('editor');
  var parsed = existing ? parseFrontMatter(existing.content) : { fm: {}, content: '' };
  var title = parsed.fm.title || '';
  var slug = existing ? existing.file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '') : '';
  var dateVal = existing ? dateToInput(parsed.fm.date) : dateToInput(new Date());
  var tags = toArr(parsed.fm.tags).join(', ');
  var comments = parsed.fm.comments !== false;
  var cover = parsed.fm.cover || '';
  var sticky = !!parsed.fm.sticky;

  return loadSiteData().then(function () {
    var cats = categoryItems();
    var selected = toArr(parsed.fm.categories);
    var isDraft = existing ? existing.draft : false;
    var html = '<h1>' + (existing ? '编辑文章' : '新建文章') + (isDraft ? '（草稿）' : '') + '</h1>';
    html += '<div class="card">';
    html += '<div class="field"><label>标题</label><input type="text" id="postTitle" value="' + esc(title) + '"></div>';
    html += '<div class="field"><label>链接别名（slug，可留空自动生成）</label><input type="text" id="postSlug" value="' + esc(slug) + '" placeholder="例如 hello-world"></div>';
    html += '<div class="field"><label>发布时间</label><input type="datetime-local" id="postDate" value="' + esc(dateVal) + '"></div>';
    html += '<div class="field"><label>分类</label><div class="checkbox-list">';
    if (cats.length) {
      cats.forEach(function (c) {
        var checked = selected.indexOf(c.name) >= 0 ? ' checked' : '';
        html += '<label><input type="checkbox" class="postCat" value="' + esc(c.name) + '"' + checked + '> ' + esc(c.name) + '</label>';
      });
    } else { html += '<span class="hint">还没有分类，可到「分类管理」中添加。</span>'; }
    html += '</div></div>';
    html += '<div class="field"><label>标签（用逗号分隔）</label><input type="text" id="postTags" value="' + esc(tags) + '"></div>';
    html += '<div class="field"><label><input type="checkbox" id="postComments"' + (comments ? ' checked' : '') + '> 允许评论（关闭后该文章不显示评论区）</label></div>';
    html += '<div class="field"><label><input type="checkbox" id="postSticky"' + (sticky ? ' checked' : '') + '> 置顶文章（首页 / 分类页排在最前）</label></div>';
    html += '<div class="field"><label>封面图</label><div class="field-row"><input type="text" id="postCover" value="' + esc(cover) + '" placeholder="/images/uploads/xxx.jpg"><input type="file" id="postCoverFile" accept="image/*"><button class="btn" id="postCoverUpload">上传封面</button></div></div>';
    html += '<div class="field"><label>正文（Markdown）</label><div class="toolbar"><input type="file" id="postImageFile" accept="image/*"><button class="btn" id="postImageBtn">插入图片</button><button class="btn" id="previewBtn">预览</button></div><textarea id="postContent">' + esc(parsed.content) + '</textarea><div class="preview" id="postPreview" style="display:none"></div></div>';
    html += '<button class="btn primary" id="savePostBtn">' + (isDraft ? '发布文章' : '保存并发布') + '</button> ';
    html += '<button class="btn" id="saveDraftBtn">' + (existing && !isDraft ? '转为草稿' : '存为草稿') + '</button> ';
    html += '<button class="btn" id="cancelPostBtn">返回列表</button>';
    html += '</div>';
    $('#content').innerHTML = html;
    bindEditor(existing);
  }).catch(showError);
}

function bindEditor(existing) {
  $('#cancelPostBtn').addEventListener('click', function () { renderPosts(); });
  $('#savePostBtn').addEventListener('click', function () { saveEditor(existing, false); });
  $('#saveDraftBtn').addEventListener('click', function () { saveEditor(existing, true); });
  $('#previewBtn').addEventListener('click', function () {
    var pv = $('#postPreview');
    if (pv.style.display === 'none') { pv.style.display = 'block'; pv.innerHTML = renderMarkdown($('#postContent').value); $('#previewBtn').textContent = '收起预览'; }
    else { pv.style.display = 'none'; $('#previewBtn').textContent = '预览'; }
  });
  $('#postCoverUpload').addEventListener('click', function () {
    var fi = $('#postCoverFile'); if (!fi.files.length) { toast('请先选择图片', true); return; }
    toast('上传中…');
    uploadImage(fi.files[0], 'uploads').then(function (p) { $('#postCover').value = p; toast('封面上传成功'); }).catch(showError);
  });
  $('#postImageBtn').addEventListener('click', function () {
    var fi = $('#postImageFile'); if (!fi.files.length) { toast('请先选择图片', true); return; }
    toast('上传中…');
    uploadImage(fi.files[0], 'uploads').then(function (p) { insertAtCursor($('#postContent'), '![](' + publicUrl(p) + ')\n'); toast('图片已插入'); }).catch(showError);
  });
}

function saveEditor(existing, asDraft) {
  var title = $('#postTitle').value.trim();
  var slug = $('#postSlug').value.trim() || slugify(title);
  var dateVal = $('#postDate').value;
  if (!title) { toast('请填写标题', true); return; }
  var dateStr = dateVal ? dateVal.replace('T', ' ') + ':00' : nowStr();
  var cats = $$('.postCat').filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
  var tags = $('#postTags').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
  var comments = $('#postComments').checked;
  var sticky = $('#postSticky').checked;
  var cover = $('#postCover').value.trim();
  var content = $('#postContent').value;
  var p = { title: title, date: dateStr, categories: cats, tags: tags, comments: comments, cover: cover, sticky: sticky, content: content };
  var raw = buildRaw(p);

  var d = dateVal ? new Date(dateVal) : new Date();
  var fileDate = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  var fileName = asDraft ? (slug + '.md') : (fileDate + '-' + slug + '.md');
  var newPath = postPath(fileName, asDraft);
  var msg = (existing ? '更新' : (asDraft ? '新建草稿' : '发布文章')) + ' ' + title;
  var currentPath = existing ? postPath(existing.file, existing.draft) : null;

  var action;
  if (existing && currentPath !== newPath) { action = moveFile(currentPath, existing.sha, newPath, msg, raw); }
  else if (existing) { action = putFile(newPath, raw, existing.sha, msg); }
  else { action = putFile(newPath, raw, null, msg); }
  action.then(function () { toast('已保存，等待 GitHub Actions 重新构建'); renderPosts(); }).catch(showError);
}

// ---------- 分类管理 ----------
function renderCategories() {
  if (!ensureConfig()) return;
  setActive('categories');
  $('#content').innerHTML = '<h1>分类管理</h1><p class="hint">加载中…</p>';
  loadSiteData().then(function () {
    var cats = categoryItems();
    var html = '<h1>分类管理</h1><p class="hint">分类会作为博客顶部导航栏展示；首页固定保留在第一位。</p>';
    html += '<div class="cat-form"><input id="catName" placeholder="分类名称，例如：技术"><button class="btn primary" id="addCatBtn">新增分类</button></div>';
    html += '<ul class="cat-list">';
    cats.forEach(function (c, i) {
      html += '<li>';
      html += '<span class="cat-name">' + esc(c.name) + '</span><span class="cat-path">' + esc(c.path) + '</span>';
      html += '<span class="cat-actions">';
      html += '<button class="btn small up" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + '>↑</button>';
      html += '<button class="btn small down" data-i="' + i + '"' + (i === cats.length - 1 ? ' disabled' : '') + '>↓</button>';
      html += '<button class="btn small rename" data-name="' + esc(c.name) + '">重命名</button>';
      html += '<button class="btn small danger del" data-name="' + esc(c.name) + '">删除</button>';
      html += '</span></li>';
    });
    html += '</ul>';
    $('#content').innerHTML = html;
    bindCategories(cats);
  }).catch(showError);
}

function bindCategories(cats) {
  $('#addCatBtn').addEventListener('click', function () {
    var name = $('#catName').value.trim();
    if (!name) { toast('请输入分类名称', true); return; }
    if (cats.some(function (c) { return c.name === name; })) { toast('分类已存在', true); return; }
    siteData.nav.push({ name: name, path: catPath(name) });
    saveSiteData('新增分类 ' + name).then(function () { toast('已新增分类'); renderCategories(); }).catch(showError);
  });
  $$('.up').forEach(function (b) { b.addEventListener('click', function () { moveCategory(cats, parseInt(b.getAttribute('data-i'), 10), -1); }); });
  $$('.down').forEach(function (b) { b.addEventListener('click', function () { moveCategory(cats, parseInt(b.getAttribute('data-i'), 10), 1); }); });
  $$('.rename').forEach(function (b) { b.addEventListener('click', function () { renameCategory(b.getAttribute('data-name')); }); });
  $$('.del').forEach(function (b) { b.addEventListener('click', function () { deleteCategory(b.getAttribute('data-name')); }); });
}

function moveCategory(cats, index, delta) {
  var target = index + delta;
  if (target < 0 || target >= cats.length) return;
  var home = siteData.nav.filter(function (i) { return i.path === '/'; });
  var others = categoryItems();
  var tmp = others[index]; others[index] = others[target]; others[target] = tmp;
  siteData.nav = home.concat(others);
  saveSiteData('调整分类顺序').then(function () { toast('已保存'); renderCategories(); }).catch(showError);
}

function renameCategory(oldName) {
  var newName = prompt('请输入新的分类名称：', oldName);
  if (!newName) return;
  newName = newName.trim();
  if (newName === oldName) return;
  if (categoryItems().some(function (c) { return c.name === newName; })) { toast('分类名已存在', true); return; }
  siteData.nav = siteData.nav.map(function (i) { return (i.path !== '/' && i.name === oldName) ? { name: newName, path: catPath(newName) } : i; });
  toast('正在更新分类及相关文章…');
  saveSiteData('重命名分类 ' + oldName + ' -> ' + newName).then(function () { return renameCategoryInPosts(oldName, newName); }).then(function () { toast('重命名完成'); renderCategories(); }).catch(showError);
}

function renameCategoryInPosts(oldName, newName) {
  return loadPosts().then(function () {
    var jobs = posts.map(function (p) { return getFile(postPath(p.name, p.draft)); });
    return Promise.all(jobs);
  }).then(function (rows) {
    var chain = Promise.resolve();
    rows.forEach(function (r) {
      var entry = posts.filter(function (p) { return postPath(p.name, p.draft) === r.path; })[0];
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
  if (!confirm('确定删除分类「' + name + '」吗？\n相关文章的该分类会被移除（文章本身保留）。')) return;
  siteData.nav = siteData.nav.filter(function (i) { return i.path === '/' || i.name !== name; });
  toast('正在删除分类并更新相关文章…');
  saveSiteData('删除分类 ' + name).then(function () { return removeCategoryFromPosts(name); }).then(function () { toast('删除完成'); renderCategories(); }).catch(showError);
}

function removeCategoryFromPosts(name) {
  return loadPosts().then(function () {
    var jobs = posts.map(function (p) { return getFile(postPath(p.name, p.draft)); });
    return Promise.all(jobs);
  }).then(function (rows) {
    var chain = Promise.resolve();
    rows.forEach(function (r) {
      var entry = posts.filter(function (p) { return postPath(p.name, p.draft) === r.path; })[0];
      var p = parseFrontMatter(r.content);
      var cats = toArr(p.fm.categories);
      if (cats.indexOf(name) >= 0) {
        var newCats = cats.filter(function (c) { return c !== name; });
        var post = postFromParsed(p); post.categories = newCats;
        chain = chain.then(function () { return putFile(postPath(entry.name, entry.draft), buildRaw(post), r.sha, '移除分类 ' + name); });
      }
    });
    return chain;
  });
}

// ---------- 站点设置 ----------
function renderSite() {
  if (!ensureConfig()) return;
  setActive('site');
  $('#content').innerHTML = '<h1>站点设置</h1><p class="hint">加载中…</p>';
  loadSiteData().then(function () {
    var bg = siteData.background || '';
    var html = '<h1>站点设置</h1>';
    html += '<h2>用户端背景图片</h2>';
    html += '<div class="bg-preview" style="' + (bg ? 'background-image:url(' + escAttr(bg) + ')' : '') + '"></div>';
    html += '<p class="hint">当前：' + esc(bg || '未设置（使用默认渐变背景）') + '</p>';
    html += '<div class="field-row"><input type="file" id="bgFile" accept="image/*"><button class="btn primary" id="bgUploadBtn">上传并设为背景</button></div>';
    html += '<div class="field-row"><input type="text" id="bgUrl" placeholder="或直接填写图片 URL（例如 /images/background/xxx.jpg）"><button class="btn" id="bgUrlBtn">使用该地址</button></div>';
    html += '<button class="btn" id="bgClearBtn">恢复默认背景</button>';
    html += '<h2>站点根路径</h2><p class="hint">用户主页填 /，项目主页填 /仓库名/。仅影响后台插入的正文图片地址，不影响主题导航。</p>';
    html += '<div class="field-row"><input type="text" id="siteBase" value="' + esc(cfg.siteBase || '/') + '"><button class="btn" id="saveSiteBaseBtn">保存</button></div>';
    $('#content').innerHTML = html;
    bindSite();
  }).catch(showError);
}

function bindSite() {
  $('#bgUploadBtn').addEventListener('click', function () {
    var fi = $('#bgFile'); if (!fi.files.length) { toast('请先选择图片', true); return; }
    toast('上传中…');
    uploadImage(fi.files[0], 'background').then(function (p) { siteData.background = p; return saveSiteData('更新背景图片'); }).then(function () { toast('背景已更新'); renderSite(); }).catch(showError);
  });
  $('#bgUrlBtn').addEventListener('click', function () {
    var u = $('#bgUrl').value.trim(); if (!u) { toast('请输入图片地址', true); return; }
    siteData.background = u;
    saveSiteData('更新背景图片').then(function () { toast('背景已更新'); renderSite(); }).catch(showError);
  });
  $('#bgClearBtn').addEventListener('click', function () {
    siteData.background = '';
    saveSiteData('恢复默认背景').then(function () { toast('已恢复默认背景'); renderSite(); }).catch(showError);
  });
  $('#saveSiteBaseBtn').addEventListener('click', function () { cfg.siteBase = $('#siteBase').value.trim() || '/'; saveConfig(); toast('站点根路径已保存'); });
}

// ---------- 账号设置 ----------
function renderSettings() {
  setActive('settings');
  var html = '<h1>账号设置</h1>';
  html += '<p class="hint">后台通过 GitHub API 直接读写仓库内容。Token 只保存在你当前浏览器的 localStorage 中，不会上传到任何服务器。</p>';
  html += '<div class="card">';
  html += '<div class="field"><label>GitHub Token（需要 Contents 读写权限）</label><input type="password" id="cfgToken" value="' + esc(cfg.token || '') + '"></div>';
  html += '<div class="field"><label>用户名 / 组织名</label><input type="text" id="cfgOwner" value="' + esc(cfg.owner || '') + '" placeholder="例如 chen"></div>';
  html += '<div class="field"><label>仓库名</label><input type="text" id="cfgRepo" value="' + esc(cfg.repo || '') + '" placeholder="例如 chen.github.io"></div>';
  html += '<div class="field"><label>分支</label><input type="text" id="cfgBranch" value="' + esc(cfg.branch || 'main') + '"></div>';
  html += '<div class="field"><label>站点根路径</label><input type="text" id="cfgBase" value="' + esc(cfg.siteBase || '/') + '" placeholder="/ 或 /仓库名/"></div>';
  html += '<button class="btn primary" id="saveCfgBtn">保存</button> <button class="btn" id="testCfgBtn">测试连接</button>';
  html += '</div>';
  $('#content').innerHTML = html;

  function readForm() {
    cfg.token = $('#cfgToken').value.trim();
    cfg.owner = $('#cfgOwner').value.trim();
    cfg.repo = $('#cfgRepo').value.trim();
    cfg.branch = $('#cfgBranch').value.trim() || 'main';
    cfg.siteBase = $('#cfgBase').value.trim() || '/';
    saveConfig();
  }
  $('#saveCfgBtn').addEventListener('click', function () { readForm(); toast('已保存'); renderPosts(); });
  $('#testCfgBtn').addEventListener('click', function () {
    readForm();
    gh('GET', 'source/_data/site.json').then(function () { toast('连接成功'); }).catch(function (e) { toast('连接失败：' + e.message, true); });
  });
}

// ---------- 启动 ----------
function init() {
  $$('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-view');
      if (v === 'editor') renderEditor(null);
      else if (v === 'posts') renderPosts();
      else if (v === 'categories') renderCategories();
      else if (v === 'site') renderSite();
      else if (v === 'settings') renderSettings();
    });
  });
  if (!cfg.token || !cfg.owner || !cfg.repo) { renderSettings(); toast('请先完成账号设置'); }
  else { renderPosts(); }
}

init();
})();