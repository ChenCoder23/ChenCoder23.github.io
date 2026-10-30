'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../themes/chen/source/js/explore-core');

test('reading records normalize encoded URLs and reject malformed data', () => {
  assert.equal(core.key('/2026/%E7%AC%94%E8%AE%B0/index.html'), '/2026/笔记/');
  const state = core.clean({'/post/':{saved:true,status:'review',progress:5},'/bad/':{status:'toString',progress:-4},'//evil.com':{},'/broken%zz':{},'https://evil.com':{}});
  assert.deepEqual(Object.keys(state), ['/post/','/bad/']);
  assert.deepEqual(state['/post/'], {saved:true,status:'review',progress:1,updated:0});
  assert.equal(state['/bad/'].status,'');
  assert.equal(state['/bad/'].progress,0);
  assert.deepEqual(core.clean([]),{});
});

test('knowledge roadmap connects actual articles and leaves unwritten concepts distinct', () => {
  const posts=[{url:'/process/',title:'进程与线程',categories:['OS'],tags:[]},{url:'/other/',title:'系统简介',categories:['OS','入门'],tags:[],content:'死锁'}];
  const roadmap={nodes:[{id:'process',label:'进程',group:'OS'},{id:'deadlock',label:'死锁',group:'OS'}],edges:[['process','deadlock'],['missing','deadlock']]};
  const g=core.buildGraph(posts,roadmap);
  assert.equal(g.nodes.find(n=>n.id==='concept:process').type,'concept');
  assert.equal(g.nodes.find(n=>n.id==='concept:deadlock').type,'planned');
  assert.deepEqual(g.nodes.find(n=>n.id==='concept:deadlock').articles,[]);
  assert.equal(g.nodes.filter(n=>n.id==='category:OS').length,1);
  assert.equal(g.edges.filter(e=>e.type==='prerequisite').length,1);
  assert.ok(g.edges.every(e=>g.nodes.some(n=>n.id===e.source)&&g.nodes.some(n=>n.id===e.target)));
});

test('exploration index uses published locals and applies site root to every URL', () => {
  let generate;
  const hexo={extend:{generator:{register(name,fn){generate=fn;}},helper:{get(){return path=>'/blog/'+path.replace(/^\//,'');}}}};
  vm.runInNewContext(fs.readFileSync('scripts/explore-generator.js','utf8'),{hexo,require:path=>path.includes('explore-core')?core:require('../source/admin/category-tree')});
  const post={title:'Published',path:'article/index.html',date:{format:()=> '2026-10-30'},categories:{toArray:()=>[{name:'OS'}]},tags:{toArray:()=>[]}};
  const route=generate({posts:{sort:()=>({toArray:()=>[post]})},categories:{toArray:()=>[{name:'OS',path:'categories/OS/'}]},data:{}});
  const result=JSON.parse(route.data);
  assert.equal(route.path,'explore.json');
  assert.equal(result.posts.length,1);
  assert.equal(result.posts[0].url,'/blog/article/');
  assert.equal(result.categories[0].url,'/blog/categories/OS/');
});

test('short technical abbreviations do not match unrelated words', () => {
  const g=core.buildGraph([{url:'/ai/',title:'ChatCPT生成图片',categories:[],tags:[]}],{nodes:[{id:'tcp',label:'TCP',group:'网络'}]});
  assert.equal(g.nodes.find(n=>n.id==='concept:tcp').type,'planned');
});
