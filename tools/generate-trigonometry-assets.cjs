// Deterministic vector plots and lossless SVG viewports of the original photo.
// Usage: node tools/generate-trigonometry-assets.cjs [path-to-original-jpg]
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '../source/images/trigonometry');
fs.mkdirSync(dir, { recursive: true });
const original = path.join(dir, 'original.jpg');
if (process.argv[2]) fs.copyFileSync(process.argv[2], original);
const photo = fs.readFileSync(original).toString('base64');
const crops = {
  sin: [0, 25, 440, 375], cos: [445, 45, 390, 355],
  tan: [845, 65, 295, 355], cot: [1170, 60, 525, 370],
  csc: [0, 450, 535, 235], sec: [565, 420, 490, 285],
  arcsin: [1090, 440, 525, 330], arccos: [0, 660, 550, 410],
  arctan: [570, 700, 530, 375], arccot: [1090, 745, 535, 405]
};
for (const [name, [x, y, w, h]] of Object.entries(crops)) {
  // SVG framing rotates the display only; the embedded original pixels are untouched.
  fs.writeFileSync(path.join(dir, `${name}-note.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"><title>${name} 手写图局部</title><image width="1279" height="1706" transform="translate(0 1279) rotate(-90)" href="data:image/jpeg;base64,${photo}"/></svg>\n`);
}
const pi = Math.PI;
const ticks = [-2*pi, -pi, -pi/2, 0, pi/2, pi, 2*pi];
const piLabel = x => new Map([[-2*pi,'−2π'],[-pi,'−π'],[-pi/2,'−π/2'],[0,'0'],[pi/2,'π/2'],[pi,'π'],[2*pi,'2π']]).get(x) || String(x);
const defs = [
  { id:'sin', f:Math.sin, x:[-2*pi-.3,2*pi+.3], y:[-1.65,1.65], xt:ticks.filter(x=>Math.abs(x)!==pi/2), yt:[-1,1], pts:[[0,0],[pi/2,1],[pi,0],[3*pi/2,-1]] },
  { id:'cos', f:Math.cos, x:[-2*pi-.3,2*pi+.3], y:[-1.65,1.65], xt:ticks.filter(x=>Math.abs(x)!==pi/2), yt:[-1,1], pts:[[0,1],[pi/2,0],[pi,-1],[2*pi,1]] },
  { id:'tan', f:Math.tan, x:[-pi,pi], y:[-4,4], xt:[-pi,-pi/2,0,pi/2,pi], yt:[-1,1], va:[-pi/2,pi/2], pts:[[0,0],[pi/4,1]] },
  { id:'cot', f:x=>Math.cos(x)/Math.sin(x), x:[-pi-.2,pi+.2], y:[-4,4], xt:[-pi,-pi/2,0,pi/2,pi], yt:[-1,1], va:[-pi,0,pi], pts:[[pi/2,0],[pi/4,1]] },
  { id:'sec', f:x=>1/Math.cos(x), x:[-2*pi-.25,2*pi+.25], y:[-4,4], xt:[-2*pi,-pi,0,pi,2*pi], yt:[-1,1], va:[-3*pi/2,-pi/2,pi/2,3*pi/2], pts:[[0,1],[pi,-1],[-pi,-1]] },
  { id:'csc', f:x=>1/Math.sin(x), x:[-2*pi-.25,2*pi+.25], y:[-4,4], xt:[-2*pi,-pi,0,pi,2*pi], yt:[-1,1], va:[-2*pi,-pi,0,pi,2*pi], pts:[[pi/2,1],[-pi/2,-1]] },
  { id:'arcsin', f:Math.asin, x:[-1.5,1.5], y:[-2,2], xt:[-1,0,1], yt:[-pi/2,pi/2], domain:[-1,1], pts:[[-1,-pi/2],[0,0],[1,pi/2]] },
  { id:'arccos', f:Math.acos, x:[-1.5,1.5], y:[-.5,3.65], xt:[-1,0,1], yt:[pi/2,pi], domain:[-1,1], pts:[[-1,pi],[0,pi/2],[1,0]] },
  { id:'arctan', f:Math.atan, x:[-6,6], y:[-2,2], xt:[-4,-1,0,1,4], yt:[-pi/2,pi/2], ha:[-pi/2,pi/2], pts:[[0,0],[1,pi/4],[-1,-pi/4]] },
  { id:'arccot', f:x=>pi/2-Math.atan(x), x:[-6,6], y:[-.5,3.65], xt:[-4,-1,0,1,4], yt:[pi/2,pi], ha:[0,pi], pts:[[0,pi/2],[1,pi/4],[-1,3*pi/4]] }
];
for (const d of defs) {
  const W=640, H=340, L=48, R=605, T=48, B=295;
  const px=x=>L+(x-d.x[0])/(d.x[1]-d.x[0])*(R-L);
  const py=y=>B-(y-d.y[0])/(d.y[1]-d.y[0])*(B-T);
  const line=(x1,y1,x2,y2,attrs='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;
  const label=(x,y,t,attrs='')=>`<text x="${x}" y="${y}" ${attrs}>${t}</text>`;
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="340" viewBox="0 0 640 340"><title>y = ${d.id} x 标准图形</title><desc>蓝色实线为函数，红色虚线为渐近线，实心点属于图形。曲线仅展示有限范围。</desc><defs><clipPath id="plot"><rect x="${L}" y="${T}" width="${R-L}" height="${B-T}"/></clipPath></defs><rect width="640" height="340" rx="12" fill="#f6f9fc"/><g font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="#52677d">`;
  out+=label(L,28,`y = ${d.id} x`,'font-size="21" fill="#24364b"');
  for (const x of d.xt) out+=line(px(x),T,px(x),B,'stroke="#e1e9f1"');
  for (const y of d.yt) out+=line(L,py(y),R,py(y),'stroke="#e1e9f1"');
  out+=line(L,py(0),R+12,py(0),'stroke="#65768a" stroke-width="1.4"');
  out+=line(px(0),T-8,px(0),B+5,'stroke="#65768a" stroke-width="1.4"');
  out+=`<path d="M${R+6},${py(0)-4} l7,4 -7,4 M${px(0)-4},${T-2} l4,-7 4,7" fill="none" stroke="#65768a"/>`;
  for(const x of d.xt) { out+=line(px(x),py(0)-3,px(x),py(0)+3,'stroke="#65768a"'); out+=label(px(x)+(x===0?-9:0),py(0)+22,piLabel(x),'text-anchor="middle"'); }
  for(const y of d.yt) out+=label(px(0)-10,py(y)-6,piLabel(y),'text-anchor="end"');
  out+=label(R+15,py(0)-8,'x')+label(px(0)+10,T-6,'y');
  for(const x of d.va||[]) out+=line(px(x),T,px(x),B,'stroke="#c25549" stroke-width="1.3" stroke-dasharray="6 5"');
  for(const y of d.ha||[]) out+=line(L,py(y),R,py(y),'stroke="#c25549" stroke-width="1.3" stroke-dasharray="6 5"');
  let curve='', drawing=false, prevX=null;
  const [a,b]=d.domain||d.x;
  for(let i=0;i<=1000;i++) {
    const x=a+(b-a)*i/1000, y=d.f(x);
    const crosses=(d.va||[]).some(v=>prevX!==null&&prevX<v&&x>=v);
    if(!Number.isFinite(y)||y<d.y[0]-.3||y>d.y[1]+.3) {drawing=false;prevX=x;continue;}
    if(crosses) drawing=false;
    curve+=`${drawing?'L':'M'}${px(x).toFixed(2)},${py(y).toFixed(2)} `;
    drawing=true;prevX=x;
  }
  out+=`<g clip-path="url(#plot)"><path d="${curve}" fill="none" stroke="#246da8" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  for(const [x,y] of d.pts||[]) out+=`<circle cx="${px(x)}" cy="${py(y)}" r="4" fill="#246da8" stroke="#f6f9fc" stroke-width="1.3"/>`;
  out+='</g></g></svg>\n';
  fs.writeFileSync(path.join(dir,`${d.id}-graph.svg`),out);
}
console.log('Generated 10 photo viewports and 10 standard graphs.');
