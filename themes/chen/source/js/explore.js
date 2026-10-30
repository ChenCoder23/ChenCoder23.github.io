(function () {
  'use strict';
  var C = window.ChenExplore, root = document.getElementById('exploreConfig');
  if (!C || !root) return;
  var config = JSON.parse(root.textContent), dataPromise, storeKey = 'chenblog-bookshelf-v1';
  var $ = function (s) { return document.querySelector(s); };
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function link(title, url, cls) { var a = el('a', title, cls); a.href = url; return a; }
  function button(title, action, cls) { var b = el('button', title, cls); b.type = 'button'; b.addEventListener('click', action); return b; }
  function data() {
    if (!dataPromise) dataPromise = fetch(config.index).then(function (r) { if (!r.ok) throw new Error('index'); return r.json(); }).catch(function (e) { dataPromise = null; throw e; });
    return dataPromise;
  }
  function notice(text) { var n = $('#exploreNotice'); if (!n) { n = el('div', '', 'explore-notice'); n.id = 'exploreNotice'; n.setAttribute('role', 'status'); document.body.appendChild(n); } n.textContent = text; n.hidden = false; clearTimeout(n.timer); n.timer = setTimeout(function () { n.hidden = true; }, 4000); }
  var memory = {}, storageFailed = false;
  function read() {
    if (storageFailed) return memory;
    try { memory = C.clean(JSON.parse(localStorage.getItem(storeKey) || '{}')); } catch (_) { storageFailed = true; }
    return memory;
  }
  function update(url, patch) {
    var state = read(), id = C.key(url);
    state[id] = Object.assign({saved:false, status:'', progress:0}, state[id], patch, {updated:Date.now()});
    memory = state;
    try { localStorage.setItem(storeKey, JSON.stringify(state)); } catch (_) { storageFailed = true; notice('浏览器未允许保存，当前修改只能在本页暂存。'); }
    return state[id];
  }
  function statusSelect(value, change) {
    var s = el('select'); s.setAttribute('aria-label', '学习状态');
    [['','未标记'],['todo','待学'],['read','已读'],['review','待复习']].forEach(function (v) { var o = el('option',v[1]); o.value = v[0]; s.appendChild(o); });
    s.value = value || ''; s.addEventListener('change', function () { change(s.value); }); return s;
  }
  function initPost() {
    var controls = $('#readingTools'); if (!controls) return;
    var url = controls.dataset.url, saved = read()[C.key(url)] || {}, paused = true, interacted = false;
    var saveButton = button('', function () { var v = read()[C.key(url)] || {}; update(url, {saved:!v.saved}); renderSave(); });
    function renderSave() { var v = read()[C.key(url)] || {}; saveButton.textContent = v.saved ? '★ 已收藏' : '☆ 收藏文章'; saveButton.setAttribute('aria-pressed', String(!!v.saved)); }
    renderSave(); controls.appendChild(saveButton);
    controls.appendChild(statusSelect(saved.status, function (v) { update(url, {status:v}); }));
    controls.appendChild(link('我的书架 →', config.bookshelf));
    if (saved.progress > 0.01) {
      var resume = el('div', '', 'reading-resume');
      resume.appendChild(el('span', '上次读到 ' + Math.round(saved.progress * 100) + '%'));
      resume.appendChild(button('继续阅读', function () { paused = false; window.scrollTo({top: positionFor(saved.progress), behavior:'instant'}); resume.remove(); }));
      resume.appendChild(button('从头阅读', function () { paused = false; update(url, {progress:0}); window.scrollTo({top:0, behavior:'instant'}); resume.remove(); }));
      controls.after(resume);
      if (new URLSearchParams(location.search).get('resume') === '1') {
        var restore = function () { paused = false; window.scrollTo({top:positionFor(saved.progress), behavior:'instant'}); resume.remove(); };
        var cover = $('.article__cover');
        if (cover && !cover.complete) { cover.addEventListener('load',restore,{once:true}); cover.addEventListener('error',restore,{once:true}); }
        else requestAnimationFrame(restore);
      }
      // Opening a saved article alone must not overwrite its previous position.
    } else paused = false;
    function positionFor(p) { var prose = $('#prose'); return prose.getBoundingClientRect().top + window.scrollY + Math.max(0, prose.offsetHeight - window.innerHeight * 0.5) * p - 100; }
    function persist() {
      if (paused || !interacted) return;
      var prose = $('#prose'), start = prose.getBoundingClientRect().top + window.scrollY - 100;
      var range = Math.max(1, prose.offsetHeight - window.innerHeight * 0.5);
      update(url, {progress:Math.max(0, Math.min(1, (window.scrollY - start) / range))});
    }
    ['wheel','touchmove','keydown'].forEach(function (event) { window.addEventListener(event, function () { interacted = true; }, {passive:true}); });
    var timer;
    window.addEventListener('scroll', function () { clearTimeout(timer); timer = setTimeout(persist, 350); }, {passive:true});
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', function () { if (document.hidden) persist(); });
    window.addEventListener('storage', function (event) { if (event.key === storeKey) { renderSave(); var v = read()[C.key(url)] || {}; controls.querySelector('select').value = v.status || ''; } });
  }
  function initShelf() {
    if (!$('#bookshelf')) return;
    var list = $('#shelfList'), filter = $('#shelfFilter'), search = $('#shelfSearch');
    function render() {
      data().then(function (d) {
        var state = read(), q = search.value.trim().toLowerCase(); list.replaceChildren();
        var records = d.posts.filter(function (p) { var s = state[C.key(p.url)]; return s && (s.saved || s.status || s.progress > 0); });
        $('#shelfSummary').textContent = records.length + ' 篇记录 · ' + records.filter(function (p) { return state[C.key(p.url)].saved; }).length + ' 篇收藏';
        var posts = records.filter(function (p) {
          var s = state[C.key(p.url)], f = filter.value;
          return (!q || (p.title + ' ' + p.categories.join(' ')).toLowerCase().includes(q)) &&
            (f === 'all' || f === 'saved' && s.saved || f === 'reading' && s.progress > 0 && s.progress < 1 || s.status === f);
        }).sort(function (a,b) { return state[C.key(b.url)].updated - state[C.key(a.url)].updated; });
        posts.forEach(function (p) {
          var s = state[C.key(p.url)], card = el('article', '', 'explore-panel shelf-card');
          card.appendChild(el('p', p.categories.join(' / ') || '随笔', 'explore-kicker'));
          var h = el('h2'); h.appendChild(link(p.title, p.url)); card.appendChild(h);
          var progress = el('progress'); progress.max = 1; progress.value = s.progress; progress.setAttribute('aria-label', '阅读进度'); card.appendChild(progress);
          card.appendChild(el('p', '读到 ' + Math.round(s.progress * 100) + '% · ' + (C.statuses[s.status] || '未标记'), 'muted'));
          var tools = el('div', '', 'reading-tools');
          tools.appendChild(link(s.progress > 0 ? '继续阅读 →' : '开始阅读 →', p.url + (s.progress > 0 ? '?resume=1' : '')));
          tools.appendChild(button(s.saved ? '★ 已收藏' : '☆ 收藏', function () { update(p.url,{saved:!s.saved}); render(); }));
          tools.appendChild(statusSelect(s.status, function (v) { update(p.url,{status:v}); render(); }));
          tools.appendChild(button('移除记录', function () {
            update(p.url,{saved:false, status:'', progress:0}); render(); notice('已从书架移除');
          }));
          card.appendChild(tools); list.appendChild(card);
        });
        if (!posts.length) {
          var empty = el('div', '', 'explore-empty'); empty.appendChild(el('h2', records.length ? '没有匹配的记录' : '书架从第一篇收藏开始'));
          empty.appendChild(el('p', records.length ? '换个关键词或筛选条件试试。' : '打开一篇文章，点击收藏或选择学习状态，就会出现在这里。'));
          empty.appendChild(link('去挑一篇文章 →', config.archives)); list.appendChild(empty);
        }
      }).catch(function () { list.replaceChildren(el('p','文章索引暂时无法加载。')); list.appendChild(button('重试', render)); });
    }
    search.addEventListener('input',render); filter.addEventListener('change',render); window.addEventListener('storage',render); render();
  }
  function initCommands() {
    var dialog = $('#commandDialog'), input = $('#commandInput'), results = $('#commandResults'), hint = $('#commandHint');
    var active = 0, items = [], lastFocus, revision = 0;
    var pages = [
      {title:'项目陈列室',url:config.projects,kind:'页面',keywords:'projects cabinlink'},
      {title:'我的阅读书架',url:config.bookshelf,kind:'页面',keywords:'bookshelf 收藏 待学 复习'},
      {title:'知识网络',url:config.knowledge,kind:'页面',keywords:'graph 知识图谱'},
      {title:'全部文章',url:config.archives,kind:'页面'},
      {title:'随机读一篇',kind:'命令',keywords:'random 随机',run:function () { data().then(function(d) { if(d.posts.length) location.href = d.posts[Math.floor(Math.random()*d.posts.length)].url; else notice('还没有可阅读的文章'); }).catch(function () { notice('文章索引加载失败，请重试'); }); }},
      {title:'打开终端彩蛋',kind:'彩蛋',keywords:'terminal 终端 help',run:function () { input.value = '> help'; render(); }}
    ];
    function show() { if (dialog.open) return; lastFocus = document.activeElement; input.value = ''; dialog.showModal(); input.focus(); render(); }
    function close() { dialog.close(); if (lastFocus) lastFocus.focus(); }
    function choose(item) { if (!item) return; if (item.run) item.run(); else location.href = item.url; }
    function highlight() { Array.from(results.children).forEach(function (e,i) { e.setAttribute('aria-selected',String(i===active)); }); var child = results.children[active]; if(child) { input.setAttribute('aria-activedescendant',child.id); child.scrollIntoView({block:'nearest'}); } else input.removeAttribute('aria-activedescendant'); }
    function draw() {
      results.replaceChildren(); active = 0;
      items.forEach(function (item,i) {
        var b = el('div', '', 'command-result'); b.id = 'command-result-' + i; b.setAttribute('role','option');
        b.appendChild(el('span',item.title)); b.appendChild(el('small',item.kind));
        b.addEventListener('click',function () { choose(item); }); results.appendChild(b);
      });
      if(!items.length) { results.appendChild(el('p','没有找到结果，试试文章名、分类名或 random。','muted')); input.removeAttribute('aria-activedescendant'); } else highlight();
    }
    async function render() {
      var seq = ++revision, q = input.value.trim().toLowerCase();
      hint.textContent = '↑ ↓ 选择 · Enter 打开 · Esc 关闭';
      if(q.startsWith('>')) {
        var cmd = q.slice(1).trim();
        hint.textContent = '终端彩蛋 · 输入 > help 查看可用命令';
        if(cmd === 'whoami') items = [{title:'coderWizard · 学习、记录、实践',kind:'输出',run:function () {}}];
        else if(cmd === 'clear') { input.value = ''; return render(); }
        else items = [
          {title:'> whoami',kind:'关于',run:function () { input.value = '> whoami'; render(); }},
          {title:'> projects',kind:'打开项目',url:config.projects}, {title:'> bookshelf',kind:'打开书架',url:config.bookshelf},
          {title:'> graph',kind:'打开知识网络',url:config.knowledge}, {title:'> random',kind:'随机文章',run:pages[4].run},
          {title:'> clear',kind:'清屏',run:function () { input.value = ''; render(); }}
        ].filter(function (p) { return !cmd || cmd==='help' || p.title.includes(cmd); });
        draw(); return;
      }
      items = pages.filter(function (p) { return !q || (p.title+' '+(p.keywords||'')).toLowerCase().includes(q); }); draw();
      try {
        var d = await data(); if(seq!==revision || !dialog.open) return;
        var extra = d.categories.map(function(c) { return {title:c.title,url:c.url,kind:'分类'}; }).concat(d.posts.map(function(p) { return {title:p.title,url:p.url,kind:'文章',keywords:p.tags.join(' ')}; }));
        items = items.concat(extra.filter(function(p) { return !q || (p.title+' '+(p.keywords||'')).toLowerCase().includes(q); })).slice(0,40); draw();
      } catch (_) { hint.textContent = '文章索引加载失败；页面导航仍可使用，重新输入可重试。'; }
    }
    $('#commandOpen').addEventListener('click',show); $('#commandClose').addEventListener('click',close);
    dialog.addEventListener('click',function(e) { if(e.target===dialog) { var r=dialog.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) close(); } });
    dialog.addEventListener('close',function () { revision++; if(lastFocus) lastFocus.focus(); });
    input.addEventListener('input',render);
    input.addEventListener('keydown',function(e) {
      if(e.isComposing) return;
      if(e.key==='ArrowDown'||e.key==='ArrowUp') { e.preventDefault(); if(items.length) { active=(active+(e.key==='ArrowDown'?1:-1)+items.length)%items.length; highlight(); } }
      if(e.key==='Enter') { e.preventDefault(); choose(items[active]); }
    });
    document.addEventListener('keydown',function(e) { if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k') { e.preventDefault(); if(dialog.open) close(); else show(); } });
  }
  function initGraph() {
    if(!$('#knowledge')) return;
    var canvas=$('#graphCanvas'), list=$('#graphNodeList'), detail=$('#graphDetail'), select=$('#graphGroup'), query=$('#graphSearch'), planned=$('#graphPlanned');
    var graph, scale=1, selected='', visible=[];
    function svgEl(tag,attrs) { var e=document.createElementNS('http://www.w3.org/2000/svg',tag); Object.keys(attrs||{}).forEach(function(k) { e.setAttribute(k,attrs[k]); }); return e; }
    function choose(n) {
      selected=n.id; detail.replaceChildren(el('p',n.type==='planned'?'COMING NEXT':'CONNECTED KNOWLEDGE','explore-kicker'),el('h2',n.label));
      if(n.type==='planned') detail.appendChild(el('p','这个知识点还没有对应文章，先在学习路线中留一个位置。','muted'));
      if(n.url) detail.appendChild(link('阅读这篇文章 →',n.url,'explore-primary'));
      var connected=graph.edges.filter(function(e) { return e.source===n.id||e.target===n.id; }).map(function(e) { return e.source===n.id?e.target:e.source; });
      var neighbors=graph.nodes.filter(function(v) { return connected.includes(v.id); });
      detail.appendChild(el('h3','相邻节点 · '+neighbors.length));
      neighbors.forEach(function(v) { var b=button(v.label+(v.type==='planned'?' · 待写':''),function() { choose(v); },'graph-neighbor'); detail.appendChild(b); });
      Array.from(canvas.querySelectorAll('[data-node]')).forEach(function(e) { e.classList.toggle('is-selected',e.dataset.node===selected); });
    }
    function render() {
      if(!graph) return;
      var q=query.value.trim().toLowerCase(), group=select.value;
      visible=graph.nodes.filter(function(n) { return (!group||n.groups.includes(group)) && (planned.checked||n.type!=='planned') && (!q||(n.label+' '+n.groups.join(' ')).toLowerCase().includes(q)); });
      canvas.replaceChildren(); list.replaceChildren();
      $('#graphCount').textContent=visible.length+' 个节点 · 点击查看关联；放大后可滚动浏览';
      if(!visible.length) { canvas.appendChild(el('p','没有匹配节点，请调整关键词或领域。','explore-empty')); detail.replaceChildren(el('p','当前筛选下没有节点。')); return; }
      var width=1100, height=Math.max(620,Math.ceil(visible.length/5)*130+120), positions=new Map();
      // Staggered rows keep article labels readable even when the network grows.
      visible.forEach(function(n,i) { var col=i%5, row=Math.floor(i/5); positions.set(n.id,{x:110+col*218+(row%2?24:0),y:100+row*130}); });
      var svg=svgEl('svg',{viewBox:'0 0 '+width+' '+height,width:width*scale,height:height*scale,role:'group','aria-label':'文章与知识点网络'});
      var defs=svgEl('defs'), marker=svgEl('marker',{id:'graphArrow',viewBox:'0 0 10 10',refX:18,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'}); marker.appendChild(svgEl('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#ff715e'})); defs.appendChild(marker); svg.appendChild(defs);
      graph.edges.forEach(function(e) { var a=positions.get(e.source), b=positions.get(e.target); if(!a||!b)return; var line=svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:e.type==='prerequisite'?'#ff715e':'#55616c','stroke-opacity':e.type==='prerequisite'?0.8:0.35,'stroke-width':e.type==='prerequisite'?2:1}); if(e.type==='prerequisite') line.setAttribute('marker-end','url(#graphArrow)'); svg.appendChild(line); });
      visible.forEach(function(n) {
        var p=positions.get(n.id), g=svgEl('g',{transform:'translate('+p.x+' '+p.y+')',tabindex:0,role:'button','aria-label':n.label+(n.type==='planned'?'，待写':''),'data-node':n.id,class:'graph-node '+n.type+(selected===n.id?' is-selected':'')});
        g.appendChild(svgEl('rect',{x:-96,y:-26,width:192,height:78,rx:8,style:'fill:transparent;stroke:none;pointer-events:all'}));
        g.appendChild(svgEl(n.type==='category'?'rect':'circle',n.type==='category'?{x:-13,y:-13,width:26,height:26,rx:5}:{r:n.type==='article'?9:12}));
        var label=svgEl('text',{y:36,'text-anchor':'middle'}); label.textContent=n.label.length>13?n.label.slice(0,12)+'…':n.label; g.appendChild(label);
        var title=svgEl('title'); title.textContent=n.label; g.appendChild(title);
        g.addEventListener('click',function() { choose(n); }); g.addEventListener('keydown',function(e) { if(e.key==='Enter'||e.key===' ') { e.preventDefault(); choose(n); } }); svg.appendChild(g);
        list.appendChild(button(n.label+(n.type==='planned'?' · 待写':''),function() { choose(n); },'node-chip'));
      }); canvas.appendChild(svg);
      var current=visible.find(function(n) { return n.id===selected; }); if(!current) choose(visible.find(function(n) { return n.type==='article'; })||visible[0]);
    }
    query.addEventListener('input',render); select.addEventListener('change',render); planned.addEventListener('change',render);
    $('#graphZoomIn').addEventListener('click',function() { scale=Math.min(2,scale+0.2); render(); });
    $('#graphZoomOut').addEventListener('click',function() { scale=Math.max(0.4,scale-0.2); render(); });
    $('#graphReset').addEventListener('click',function() { scale=1; canvas.scrollTo(0,0); render(); });
    function load() { data().then(function(d) { graph=d.graph; var groups=Array.from(new Set(graph.nodes.flatMap(function(n) { return n.groups; }))); groups.forEach(function(g) { var o=el('option',g); o.value=g; select.appendChild(o); }); render(); }).catch(function() { canvas.replaceChildren(el('p','知识网络加载失败。')); canvas.appendChild(button('重试',load)); }); }
    load();
  }
  initPost(); initCommands(); initShelf(); initGraph();
})();
