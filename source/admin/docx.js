/**
 * 作业文档的 .docx 生成与检查（纯逻辑，不碰 DOM）
 * 后台管理页按 admin/index.html → docx.js → admin.js 的顺序加载，挂在 window.__CHEN_DOCX__ 上。
 * 生成的是「最小合法 OOXML」：正文、样式、属性几件必需部件，排版按学院风
 * （标题黑体二号居中，正文宋体小四、1.5 倍行距、首行缩进 2 字符）。
 * 占位符 xingming / xuehao / banji 由管理员在正文里手写，读者下载时由前台替换。
 */
(function (global) {
  'use strict';

  var DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
  // 必须与 themes/chen/_config.yml 的 homework.placeholders 保持一致
  var PLACEHOLDERS = [
    { token: 'xingming', label: '姓名' },
    { token: 'xuehao', label: '学号' },
    { token: 'banji', label: '班级' }
  ];
  var PART_RE = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;
  var TAG_RE = /<[^>]*>/g;

  var FONT = {
    title: { eastAsia: '黑体', ascii: 'SimHei' },
    heading: { eastAsia: '黑体', ascii: 'SimHei' },
    body: { eastAsia: '宋体', ascii: 'Times New Roman' }
  };
  // 字号用半磅：44 = 二号，32 = 三号，28 = 四号，24 = 小四
  var SIZE = { title: 44, h1: 32, h2: 28, h3: 24, body: 24 };

  function escapeXml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function runProps(font, size, bold) {
    return '<w:rFonts w:ascii="' + font.ascii + '" w:hAnsi="' + font.ascii + '" w:eastAsia="' + font.eastAsia + '"/>' +
      (bold ? '<w:b/>' : '') +
      '<w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/>';
  }

  function run(text, font, size, bold) {
    return '<w:r><w:rPr>' + runProps(font, size, bold) + '</w:rPr>' +
      '<w:t xml:space="preserve">' + escapeXml(text) + '</w:t></w:r>';
  }

  // 行内只认 **加粗**，其余原样输出
  function runs(text, font, size, bold) {
    var value = String(text == null ? '' : text);
    var out = '';
    var re = /\*\*([^*]+)\*\*/g;
    var last = 0;
    var m = re.exec(value);
    while (m) {
      if (m.index > last) out += run(value.slice(last, m.index), font, size, bold);
      out += run(m[1], font, size, true);
      last = m.index + m[0].length;
      m = re.exec(value);
    }
    if (last < value.length || !out) out += run(value.slice(last), font, size, bold);
    return out;
  }

  function paragraph(text, kind) {
    if (kind === 'title') {
      return '<w:p><w:pPr><w:spacing w:before="0" w:after="240" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>' +
        runs(text, FONT.title, SIZE.title, false) + '</w:p>';
    }
    if (kind === 'h1' || kind === 'h2' || kind === 'h3') {
      return '<w:p><w:pPr><w:spacing w:before="200" w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>' +
        runs(text, FONT.heading, SIZE[kind], true) + '</w:p>';
    }
    if (kind === 'bullet' || kind === 'ordered') {
      return '<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/>' +
        '<w:ind w:leftChars="200" w:left="480" w:hangingChars="100" w:hanging="240"/><w:jc w:val="both"/></w:pPr>' +
        runs(text, FONT.body, SIZE.body, false) + '</w:p>';
    }
    return '<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/>' +
      '<w:ind w:firstLineChars="200" w:firstLine="480"/><w:jc w:val="both"/></w:pPr>' +
      runs(text, FONT.body, SIZE.body, false) + '</w:p>';
  }

  // 精简 Markdown：空行分段、#/##/### 标题、- * + 无序列表、1. 有序列表、**加粗**
  function blocks(body) {
    var lines = String(body || '').replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var para = null;
    function flush() {
      if (para !== null) { out.push({ kind: 'body', text: para }); para = null; }
    }
    lines.forEach(function (line) {
      var text = String(line).replace(/[ \t]+$/, '');
      if (!text.trim()) { flush(); return; }
      var m = text.match(/^(#{1,3})\s+(.*)$/);
      if (m) { flush(); out.push({ kind: 'h' + m[1].length, text: m[2].trim() }); return; }
      m = text.match(/^\s*[-*+]\s+(.*)$/);
      if (m) { flush(); out.push({ kind: 'bullet', text: '· ' + m[1].trim() }); return; }
      m = text.match(/^\s*(\d+)[.)]\s+(.*)$/);
      if (m) { flush(); out.push({ kind: 'ordered', text: m[1] + '. ' + m[2].trim() }); return; }
      var piece = text.trim();
      if (para === null) para = piece;
      // 中文之间不补空格，英文单词之间补一个
      else para += (/[A-Za-z0-9]$/.test(para) && /^[A-Za-z0-9]/.test(piece) ? ' ' : '') + piece;
    });
    flush();
    return out;
  }

  function documentXml(title, body) {
    var out = '';
    var head = String(title || '').trim();
    if (head) out += paragraph(head, 'title');
    blocks(body).forEach(function (block) { out += paragraph(block.text, block.kind); });
    if (!out) out = paragraph('', 'body');
    return DECL +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      out +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1440" w:right="1797" w:bottom="1440" w:left="1797" w:header="851" w:footer="992" w:gutter="0"/>' +
      '<w:docGrid w:linePitch="312"/></w:sectPr>' +
      '</w:body></w:document>';
  }

  function stylesXml() {
    return DECL + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults>' +
      '<w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体" w:cs="Times New Roman"/>' +
      '<w:sz w:val="24"/><w:szCs w:val="24"/>' +
      '<w:lang w:val="en-US" w:eastAsia="zh-CN"/>' +
      '</w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault>' +
      '</w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      '</w:styles>';
  }

  function packageFiles(title, body, meta) {
    var opts = meta || {};
    var author = String(opts.author || '');
    var stamp = String(opts.stamp || new Date().toISOString().replace(/\.\d+Z$/, 'Z'));
    var name = String(title || '').trim() || '作业文档';
    return {
      '[Content_Types].xml': DECL + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
        '</Types>',
      '_rels/.rels': DECL + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
        '</Relationships>',
      'word/_rels/document.xml.rels': DECL + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
      'word/document.xml': documentXml(title, body),
      'word/styles.xml': stylesXml(),
      'docProps/core.xml': DECL + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<dc:title>' + escapeXml(name) + '</dc:title>' +
        '<dc:creator>' + escapeXml(author) + '</dc:creator>' +
        '<cp:lastModifiedBy>' + escapeXml(author) + '</cp:lastModifiedBy>' +
        '<dcterms:created xsi:type="dcterms:W3CDTF">' + stamp + '</dcterms:created>' +
        '<dcterms:modified xsi:type="dcterms:W3CDTF">' + stamp + '</dcterms:modified>' +
        '</cp:coreProperties>',
      'docProps/app.xml': DECL + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
        '<Application>ChenBlog 后台</Application>' +
        '</Properties>'
    };
  }

  function build(title, body, fflate, meta) {
    if (!fflate) throw new Error('生成组件（fflate）没有加载成功');
    var parts = packageFiles(title, body, meta);
    var zipInput = {};
    Object.keys(parts).forEach(function (name) { zipInput[name] = fflate.strToU8(parts[name]); });
    return fflate.zipSync(zipInput);
  }

  // 检查文档里有没有占位符：先把标签去掉再找，Word 把占位符拆进多个 <w:t> 也算命中
  function inspect(bytes, fflate) {
    var hits = {};
    PLACEHOLDERS.forEach(function (p) { hits[p.token] = 0; });
    if (!fflate || !bytes) return { hits: hits, found: [], total: 0 };
    var files;
    try {
      files = fflate.unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    } catch (e) {
      return null;
    }
    Object.keys(files).forEach(function (name) {
      if (!PART_RE.test(name)) return;
      var text = fflate.strFromU8(files[name]).replace(TAG_RE, '');
      PLACEHOLDERS.forEach(function (p) {
        var count = text.split(p.token).length - 1;
        if (count > 0) hits[p.token] += count;
      });
    });
    var found = PLACEHOLDERS.filter(function (p) { return hits[p.token] > 0; })
      .map(function (p) { return p.label; });
    var total = Object.keys(hits).reduce(function (sum, key) { return sum + hits[key]; }, 0);
    return { hits: hits, found: found, total: total };
  }

  global.__CHEN_DOCX__ = {
    PLACEHOLDERS: PLACEHOLDERS,
    PART_RE: PART_RE,
    FONT: FONT,
    SIZE: SIZE,
    escapeXml: escapeXml,
    blocks: blocks,
    documentXml: documentXml,
    stylesXml: stylesXml,
    packageFiles: packageFiles,
    build: build,
    inspect: inspect
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
