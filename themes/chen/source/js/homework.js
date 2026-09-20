/**
 * 作业文档下载（/homework/）
 * 读者先填姓名 / 学号 / 班级，脚本把 .docx 里的占位符（默认 xingming / xuehao / banji）
 * 换成填写的内容，再以「姓名 + 学号 + 原文件名」保存到本地。
 * 信息只在浏览器里用一次：不发给任何服务器、不提交进仓库，最多记在 localStorage 里方便下次填写。
 * 依赖同页加载的 fflate（/js/vendor/fflate.min.js）做 .docx 的解包与回包。
 */
(function (global) {
  'use strict';

  /* ---------- 纯逻辑（不碰 DOM，可在 Node 里单测） ---------- */

  var DEFAULT_PLACEHOLDERS = { name: 'xingming', sid: 'xuehao', cls: 'banji' };
  var MAX_LENGTH = { name: 20, sid: 30, cls: 30 };
  var LABEL = { name: '姓名', sid: '学号', cls: '班级' };
  // 需要替换的部件：正文 + 页眉页脚 + 脚注尾注，其余部件（图片等）原样搬运
  var PART_RE = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;
  // 文件名里不允许出现的字符
  var ILLEGAL_RE = /[\\/:*?"<>|\u0000-\u001f]/g;
  var XML_RE = /[&<>"']/g;
  var XML_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  var MAX_FILENAME = 120;

  function escapeXml(value) {
    return String(value == null ? '' : value).replace(XML_RE, function (c) { return XML_MAP[c]; });
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Word 会把一段文字拆进多个 <w:t>（拼写检查、修订记录都会），
  // 所以占位符字符之间允许夹任意标签，拆开的 "xing" + "ming" 也能命中。
  var TOLERANT_CACHE = {};
  function tolerantRegExp(token) {
    var key = String(token);
    if (!TOLERANT_CACHE[key]) {
      var chars = key.split('').map(escapeRegExp);
      TOLERANT_CACHE[key] = new RegExp(chars.join('(?:<[^>]+>)*'), 'g');
    }
    var re = TOLERANT_CACHE[key];
    re.lastIndex = 0;
    return re;
  }

  // 替换一个部件里的全部占位符，返回 { xml, hits }
  function replacePlaceholders(xml, values, placeholders) {
    var text = String(xml == null ? '' : xml);
    var hits = 0;
    Object.keys(placeholders).forEach(function (key) {
      var token = String(placeholders[key] == null ? '' : placeholders[key]).trim();
      if (!token) return;
      // 值先做 XML 转义，再交给函数式 replace（避免 $& 之类的替换语义）
      var value = escapeXml(values && values[key]);
      text = text.replace(tolerantRegExp(token), function () { hits += 1; return value; });
    });
    return { xml: text, hits: hits };
  }

  function sanitizeFilePart(value) {
    var s = String(value == null ? '' : value).replace(ILLEGAL_RE, '').replace(/\s+/g, ' ').trim();
    if (s.length > MAX_FILENAME) {
      var ext = /\.docx$/i.test(s) ? s.slice(-5) : '';
      s = s.slice(0, MAX_FILENAME - ext.length) + ext;
    }
    return s;
  }

  // 下载名 = 姓名 + 学号 + 原文件名；原文件名缺失时退回文档标题 + .docx
  function buildFileName(values, doc) {
    var original = String((doc && doc.filename) || '').trim();
    if (!original) {
      original = String((doc && doc.title) || '作业文档').trim();
      if (!/\.docx$/i.test(original)) original += '.docx';
    }
    var name = String(values && values.name || '') + String(values && values.sid || '') + original;
    return sanitizeFilePart(name) || '作业文档.docx';
  }

  function validate(values, max) {
    var limits = max || MAX_LENGTH;
    var keys = ['name', 'sid', 'cls'];
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      var value = String((values && values[key]) || '').trim();
      if (!value) return { ok: false, field: key, message: '请先填写' + LABEL[key] };
      if (value.length > limits[key]) {
        return { ok: false, field: key, message: LABEL[key] + '最多 ' + limits[key] + ' 个字' };
      }
    }
    return { ok: true };
  }

  function readPlaceholders(raw) {
    var parsed = null;
    if (raw && typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    } else if (raw && typeof raw === 'object') {
      parsed = raw;
    }
    var out = {};
    Object.keys(DEFAULT_PLACEHOLDERS).forEach(function (key) {
      out[key] = (parsed && parsed[key]) ? String(parsed[key]) : DEFAULT_PLACEHOLDERS[key];
    });
    return out;
  }

  // 解包 → 替换 → 回包：改动过的部件重新压缩，其余原样搬运（level 0，不做无用功）
  function processDocx(fflate, bytes, values, placeholders) {
    if (!fflate) throw new Error('下载组件未就绪');
    var files = fflate.unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    var output = {};
    var hits = 0;
    Object.keys(files).forEach(function (name) {
      var raw = files[name];
      if (!PART_RE.test(name)) { output[name] = [raw, { level: 0 }]; return; }
      var result = replacePlaceholders(fflate.strFromU8(raw), values, placeholders);
      hits += result.hits;
      output[name] = result.hits ? [fflate.strToU8(result.xml), { level: 6 }] : [raw, { level: 0 }];
    });
    return { bytes: fflate.zipSync(output), hits: hits };
  }

  global.__CHEN_HOMEWORK__ = {
    DEFAULT_PLACEHOLDERS: DEFAULT_PLACEHOLDERS,
    MAX_LENGTH: MAX_LENGTH,
    PART_RE: PART_RE,
    escapeXml: escapeXml,
    tolerantRegExp: tolerantRegExp,
    replacePlaceholders: replacePlaceholders,
    sanitizeFilePart: sanitizeFilePart,
    buildFileName: buildFileName,
    validate: validate,
    readPlaceholders: readPlaceholders,
    processDocx: processDocx
  };

  /* ---------- 页面交互 ---------- */

  if (typeof document === 'undefined') return;
  var root = document.querySelector('[data-hw]');
  if (!root) return;

  var STORE_KEY = 'chenblog-homework-student';
  var DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var fflate = global.fflate;
  var placeholders = readPlaceholders(root.getAttribute('data-placeholders'));
  var modal = document.getElementById('hwModal');
  var form = document.getElementById('hwForm');
  var msgBox = document.getElementById('hwMsg');
  var docLine = document.getElementById('hwModalDoc');
  var submitBtn = document.getElementById('hwSubmit');
  var clearBtn = document.getElementById('hwClear');
  var inputs = {
    name: document.getElementById('hwName'),
    sid: document.getElementById('hwSid'),
    cls: document.getElementById('hwCls')
  };
  var triggers = Array.prototype.slice.call(root.querySelectorAll('[data-hw-download]'));
  var current = null;
  var busy = false;

  function toast(message) {
    var el = document.getElementById('chenToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'chenToast';
      el.className = 'chen-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.classList.remove('is-on'); }, 2600);
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeStore(values) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(values)); } catch (e) { /* 隐私模式下写不进去也不影响下载 */ }
  }
  function clearStore() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* 同上 */ }
  }

  function setMessage(text, kind) {
    if (!msgBox) return;
    msgBox.textContent = text || '';
    msgBox.className = 'hw-form__msg' + (kind ? ' is-' + kind : '');
  }

  function setBusy(on) {
    busy = on;
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.textContent = on ? '正在准备…' : '开始下载';
  }

  // fflate 没加载成功（网络被拦、CDN 挂了）时，先把按钮关掉并说明原因，免得点了没反应
  function lockLibrary() {
    var tip = document.createElement('p');
    tip.className = 'hw__warn';
    tip.textContent = '下载组件没有加载成功，请刷新页面重试；一直不行的话，多半是网络把脚本拦住了。';
    root.insertBefore(tip, root.querySelector('.hw__list') || null);
    triggers.forEach(function (btn) { btn.disabled = true; btn.classList.add('is-disabled'); });
  }
  if (!fflate) lockLibrary();

  function openModal(trigger) {
    current = {
      url: trigger.getAttribute('data-url') || '',
      filename: trigger.getAttribute('data-filename') || '',
      title: trigger.getAttribute('data-title') || ''
    };
    var saved = readStore();
    Object.keys(inputs).forEach(function (key) {
      if (inputs[key]) inputs[key].value = saved[key] || '';
    });
    if (docLine) docLine.textContent = '即将下载：' + (current.title || current.filename || '作业文档');
    setMessage('');
    modal.hidden = false;
    document.body.classList.add('hw-modal-open');
    var target = (inputs.name && !inputs.name.value) ? inputs.name
      : ((inputs.sid && !inputs.sid.value) ? inputs.sid
        : ((inputs.cls && !inputs.cls.value) ? inputs.cls : inputs.name));
    setTimeout(function () { if (target) { try { target.focus(); } catch (e) { /* 忽略 */ } } }, 30);
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('hw-modal-open');
    setMessage('');
    current = null;
  }

  function saveBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
  }

  function runDownload(values) {
    var doc = current;
    setBusy(true);
    setMessage('正在读取文档并替换个人信息…');
    fetch(doc.url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) {
        throw new Error(res.status === 404
          ? '文档还没构建完成（404），请稍后重试'
          : '文档下载失败（HTTP ' + res.status + '）');
      }
      return res.arrayBuffer();
    }).then(function (buffer) {
      var out;
      try {
        out = processDocx(fflate, buffer, values, placeholders);
      } catch (e) {
        throw new Error('文档解析失败，可能不是标准的 .docx 文件');
      }
      var filename = buildFileName(values, doc);
      saveBlob(new Blob([out.bytes], { type: DOCX_MIME }), filename);
      closeModal();
      toast(out.hits
        ? '已下载：' + filename
        : '这份文档没有找到占位符，已按原文件下载：' + filename);
    }).catch(function (err) {
      setMessage((err && err.message) || '下载失败，请稍后重试', 'err');
    }).then(function () {
      setBusy(false);
    });
  }

  if (!modal) return;

  triggers.forEach(function (btn) {
    btn.addEventListener('click', function () { if (fflate) openModal(btn); });
  });

  Array.prototype.slice.call(modal.querySelectorAll('[data-hw-close]')).forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy || !current) return;
      var values = {
        name: inputs.name ? inputs.name.value.trim() : '',
        sid: inputs.sid ? inputs.sid.value.trim() : '',
        cls: inputs.cls ? inputs.cls.value.trim() : ''
      };
      var check = validate(values);
      if (!check.ok) {
        setMessage(check.message, 'err');
        var field = inputs[check.field];
        if (field) { try { field.focus(); } catch (err) { /* 忽略 */ } }
        return;
      }
      writeStore(values);
      runDownload(values);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      clearStore();
      Object.keys(inputs).forEach(function (key) { if (inputs[key]) inputs[key].value = ''; });
      setMessage('已清除这台电脑上记住的信息', 'ok');
      if (inputs.name) { try { inputs.name.focus(); } catch (e) { /* 忽略 */ } }
    });
  }
})(typeof window !== 'undefined' ? window : this);
