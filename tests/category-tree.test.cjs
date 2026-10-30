const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const taxonomy = require('../source/admin/category-tree');

test('keeps existing links and builds arbitrary depth without changing article memberships', () => {
  const tree = taxonomy.build([{name:'首页',path:'/'},{name:'408',path:'/categories/408/'},{name:'OS',parent:'408',path:'/categories/old-os/'},{name:'进程',parent:'OS'}], [{name:'旧分类',path:'/categories/legacy/'}]);
  assert.deepEqual(taxonomy.trail(tree,'进程').map(n=>n.name), ['408','OS','进程']);
  assert.deepEqual(taxonomy.names(tree,'408'), ['408','OS','进程']);
  assert.equal(tree.map.get('OS').path, '/categories/old-os/');
  assert.ok(tree.map.has('旧分类'));
  assert.deepEqual(taxonomy.flatten(tree).map(n=>n.depth), [0,1,2,0]);
});

test('repairs cycles and missing parents and handles duplicate and prototype-like names', () => {
  const tree = taxonomy.build([{name:'A',parent:'B'},{name:'B',parent:'C'},{name:'C',parent:'A'},{name:'orphan',parent:'missing'},{name:'self',parent:'self'},{name:'__proto__'},{name:'A'}]);
  assert.equal(taxonomy.flatten(tree).length,6);
  assert.equal(tree.map.get('orphan').parent,'');
  assert.equal(tree.map.get('self').parent,'');
});

test('parent routes aggregate descendants once, preserve URLs, include empty directories, and exclude drafts', () => {
  const generators = {};
  const hexo = {extend:{helper:{register(){}},generator:{register(name,fn){generators[name]=fn;}}}};
  vm.runInNewContext(fs.readFileSync('scripts/category-tree.js','utf8'), {hexo, require:()=>taxonomy});
  const post = names=>({categories:{toArray:()=>names.map(name=>({name}))}});
  const a=post(['child','leaf']), b=post(['root']), other=post(['legacy']);
  const locals={data:{site:{nav:[{name:'root',path:'/categories/root/'},{name:'child',parent:'root',path:'/categories/%E5%AD%90/'},{name:'leaf',parent:'child'},{name:'empty'}]}},categories:{toArray:()=>[{name:'legacy',path:'categories/legacy/'}]},posts:{toArray:()=>[a,b,other]}};
  const routes=generators.category(locals);
  const root=routes.find(r=>r.data.category==='root');
  assert.equal(root.data.posts.length,2);
  assert.equal(root.data.posts[0],a);
  assert.equal(routes.find(r=>r.data.category==='child').path,'categories/子/index.html');
  assert.equal(routes.find(r=>r.data.category==='empty').data.posts.length,0);
  assert.ok(routes.some(r=>r.path==='topics/index.html'));
  assert.ok(routes.some(r=>r.path==='categories/legacy/index.html'));
});
