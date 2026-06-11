// 欢迎/门户页交互：插画墙、数据 count-up、滚动进场、节目门户卡片。数据全部运行时从 dishes.json / seasons.json / episodes 读取。
const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

main();
async function main(){
  const ds = await (await fetch('./dishes.json')).json();
  buildWall(ds);
  buildStats(computeStats(ds));
  await buildConnDemo(ds);
  await buildPortal(ds);
  initReveals();
  initCountUp();
}

/* ---------- 招牌功能 · 风味连接（大闸蟹迁移：太湖 → 荷兰） ---------- */
const NS = 'http://www.w3.org/2000/svg';
const WORLD = {lngMin:-169.110266,lngMax:190.486279,latTop:83.600842,latBottom:-58.508473,width:1009.6727,height:665.96301};
function worldPx(lng,lat){
  const merc = l => Math.log(Math.tan(Math.PI/4 + l*Math.PI/360));
  const MTOP = merc(WORLD.latTop), MBOT = merc(WORLD.latBottom);
  return {
    x:(lng-WORLD.lngMin)/(WORLD.lngMax-WORLD.lngMin)*WORLD.width,
    y:(MTOP-merc(lat))/(MTOP-MBOT)*WORLD.height
  };
}
function elNS(tag, attrs){ const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); return e; }

// 招牌跨地域连接（横跨欧亚美）。按「主题组」展示：一条连接可能串起 3 道以上美食，全部标出，文案用整段 groupDesc。
const FEATURED = [
  {ep:'fw1-01', theme:'大闸蟹'},
  {ep:'fw1-02', theme:'面食西传'},
  {ep:'fw1-04', theme:'嗜臭·发酵'},
  {ep:'fw1-05', theme:'小龙虾·跨洋'},
  {ep:'fw1-07', theme:'番薯·从南美到福建'},
  {ep:'fw4-01', theme:'大麦酿酒·跨越山海'},
];
// 近重合的点(太湖/苏州、绍兴/宁波/上海)轻量分开，避免标记叠成一团
function relaxPins(arr, minD, iters){
  for(let it=0; it<iters; it++)
    for(let i=0;i<arr.length;i++) for(let j=i+1;j<arr.length;j++){
      const dx=arr[j].x-arr[i].x, dy=arr[j].y-arr[i].y, d=Math.hypot(dx,dy)||0.01;
      if(d<minD){ const push=(minD-d)/2, ux=dx/d, uy=dy/d;
        arr[i].x-=ux*push; arr[i].y-=uy*push; arr[j].x+=ux*push; arr[j].y+=uy*push; }
    }
}

async function buildConnDemo(ds){
  const host = document.querySelector('#connDemoMap');
  if(!host) return;
  const byId = Object.fromEntries(ds.map(d=>[d.id,d]));

  // 取每个主题组的全部连接、全部美食、整段文案
  const eps = {};
  await Promise.all([...new Set(FEATURED.map(f=>f.ep))].map(async ep=>{
    try{ eps[ep] = await (await fetch(`./episodes/${ep}.json`)).json(); }catch(e){ eps[ep]={links:[]}; }
  }));
  const items = FEATURED.map(f=>{
    const ep = eps[f.ep]||{};
    const links = (ep.links||[]).filter(l=>l.theme===f.theme);
    if(!links.length) return null;
    const ids=[]; links.forEach(l=>[l.a,l.b].forEach(id=>{ if(!ids.includes(id)) ids.push(id); }));
    const dishes = ids.map(id=>byId[id]).filter(Boolean);
    const desc = (ep.groupDesc&&ep.groupDesc[f.theme]) || (links[0]&&links[0].desc) || '';
    return {theme:f.theme, desc, dishes, links};
  }).filter(Boolean);
  if(!items.length) return;

  // 底图（viewBox 稍后按招牌点裁成横图）
  const svg = elNS('svg', {class:'conn-svg'});
  try{
    const src = new DOMParser().parseFromString(await (await fetch('./assets/world.svg')).text(), 'image/svg+xml');
    const base = elNS('g', {class:'conn-base'});
    src.querySelectorAll('path').forEach(p=>base.appendChild(p.cloneNode(true)));
    svg.appendChild(base);
  }catch(e){}

  // 所有出现过的菜 → 像素位置 + 轻量防重叠（弧线与钉共用这套位置）
  const pos = {};
  items.forEach(it=>it.dishes.forEach(d=>{ if(!pos[d.id]){ const p=worldPx(d.lng,d.lat); pos[d.id]={x:p.x,y:p.y}; } }));
  { const arr=Object.values(pos); relaxPins(arr,40,80); }

  // 裁剪到招牌点所在区域，并拉成横图（更大、更宽）；钉与字按缩放比例放大
  const xs=Object.values(pos).map(p=>p.x), ys=Object.values(pos).map(p=>p.y), pad=46;
  let x0=Math.min(...xs)-pad, y0=Math.min(...ys)-pad;
  let bw=Math.max(...xs)-Math.min(...xs)+pad*2, bh=Math.max(...ys)-Math.min(...ys)+pad*2;
  const AR=2.4;
  if(bw/bh<AR){ const nw=bh*AR; x0-=(nw-bw)/2; bw=nw; } else { const nh=bw/AR; y0-=(nh-bh)/2; bh=nh; }
  svg.setAttribute('viewBox', `${x0} ${y0} ${bw} ${bh}`);
  const S={disc:bw*0.0135, glow:bw*0.023, img:bw*0.021, font:bw*0.0125};

  const mkPin = (p, d, below)=>{
    const g = elNS('g', {class:'c-pin', transform:`translate(${p.x},${p.y})`});
    g.appendChild(elNS('circle', {class:'glow', r:S.glow}));
    g.appendChild(elNS('circle', {class:'disc', r:S.disc}));
    const img = elNS('image', {x:-S.img/2, y:-S.img/2, width:S.img, height:S.img, href:`./assets/svg/${d.svg}`});
    img.setAttributeNS('http://www.w3.org/1999/xlink','href',`./assets/svg/${d.svg}`);
    g.appendChild(img);
    const off=S.disc+S.font*1.3;
    const t = elNS('text', {class:'lab', x:0, y:below? off+S.font*0.6 : -off, 'font-size':S.font}); t.textContent=d.name;
    g.appendChild(t);
    return g;
  };

  // 先画所有暗弧，再画钉（钉在弧之上）
  const arcLayer = elNS('g',{}); const pinLayer = elNS('g',{});
  items.forEach(it=>{
    it.arcEls = it.links.map(l=>{
      const pa=pos[l.a], pb=pos[l.b]; if(!pa||!pb) return null;
      const cx=(pa.x+pb.x)/2, cy=(pa.y+pb.y)/2 - Math.min(Math.abs(pb.x-pa.x)*0.3, 150);
      const arc = elNS('path', {class:'c-arc', d:`M${pa.x} ${pa.y} Q${cx} ${cy} ${pb.x} ${pb.y}`});
      arcLayer.appendChild(arc); return arc;
    }).filter(Boolean);
    it.pinEls = it.dishes.map((d,di)=>{ const g=mkPin(pos[d.id], d, di%2===0); pinLayer.appendChild(g); return g; });
  });
  svg.appendChild(arcLayer); svg.appendChild(pinLayer);
  host.appendChild(svg);

  // 文案 + 圆点
  const themeEl = document.querySelector('#connTheme');
  const descEl  = document.querySelector('#connDesc');
  const foot    = document.querySelector('.conn-foot');
  const dotsBox = document.querySelector('#connDots');
  items.forEach((it,i)=>{ const b=document.createElement('button'); b.className='conn-dot'; b.dataset.i=i;
    b.setAttribute('aria-label', it.theme); b.addEventListener('click',()=>{ go(i); restart(); }); dotsBox.appendChild(b); it.dot=b; });

  let cur = -1;
  function go(i){
    if(i===cur) return;
    const prev = cur; cur = i;
    items.forEach((it,k)=>{
      const on = k===i;
      it.arcEls.forEach((a,ai)=>{ a.classList.toggle('hot', on);
        if(on && !reduce){ const len=a.getTotalLength();
          a.style.strokeDasharray=len; a.style.strokeDashoffset=len;
          requestAnimationFrame(()=>{ a.style.transition=`stroke-dashoffset 1.3s ease ${ai*0.12}s`; a.style.strokeDashoffset=0; });
        }
      });
      it.pinEls.forEach(p=>p.classList.toggle('hot', on));
      it.dot.classList.toggle('on', on);
    });
    // 文案淡入淡出
    const set = ()=>{ themeEl.textContent=items[i].theme; descEl.textContent=items[i].desc; };
    if(reduce || prev<0){ set(); }
    else{ foot.classList.add('swap'); setTimeout(()=>{ set(); foot.classList.remove('swap'); }, 260); }
  }

  let timer=null;
  const start = ()=>{ if(reduce) return; timer=setInterval(()=>go((cur+1)%items.length), 5200); };
  const restart = ()=>{ clearInterval(timer); start(); };
  host.closest('.conn-card').addEventListener('mouseenter', ()=>clearInterval(timer));
  host.closest('.conn-card').addEventListener('mouseleave', start);

  // 进入视口才开播
  const kick = ()=>{ go(0); start(); };
  if(reduce){ go(0); return; }
  const io = new IntersectionObserver((es)=>{ for(const e of es){ if(e.isIntersecting){ kick(); io.disconnect(); break; } } }, {threshold:0.3});
  io.observe(host);
}

/* ---------- Hero 插画墙 ---------- */
function buildWall(ds){
  const wall = $('#wall');
  const pick = ds.slice().sort(()=>Math.random()-0.5).slice(0, 120);
  const frag = document.createDocumentFragment();
  for(const d of pick){
    const cell = document.createElement('div'); cell.className = 'cell';
    cell.innerHTML = `<img src="./assets/svg/${d.svg}" alt="" loading="lazy">`;
    frag.appendChild(cell);
  }
  wall.appendChild(frag);
}

/* ---------- 数据看点 ---------- */
function computeStats(ds){
  const seasons = new Set(ds.map(d=>d.season));
  const eps = new Set(ds.map(d=>d.season+'-'+d.episode));
  const countries = new Set(ds.filter(d=>d.scope==='world').map(d=>d.region.split('·')[0])).size + 1; // +中国
  return [
    {num: ds.length,    lab:'道美食'},
    {num: seasons.size, lab:'季'},
    {num: eps.size,     lab:'集'},
    {num: countries,    lab:'国家与地区'},
  ];
}
function buildStats(stats){
  const grid = $('#statsGrid');
  grid.innerHTML = stats.map(s=>
    `<li class="stat"><div class="num" data-target="${s.num}">0</div><div class="lab">${s.lab}</div></li>`
  ).join('');
}

/* ---------- 节目门户 ---------- */
async function buildPortal(ds){
  const grid = $('#portalGrid');
  let seasons = [];
  try{ seasons = await (await fetch('./seasons.json')).json(); }catch(e){}
  const seasonCount = new Set(ds.map(d=>d.season)).size;
  const epCount = new Set(ds.map(d=>d.season+'-'+d.episode)).size;
  const covers = seasons.map(s=>s.cover).filter(Boolean).slice(0,4);

  // 《风味人间》— 可进入
  const fan = covers.map((c,i)=>{
    const rot = [-12,-4,4,12][i] ?? 0, dx = [-60,-22,22,60][i] ?? 0;
    return `<img src="./${c}" alt="" style="transform:translateX(calc(-50% + ${dx}px)) rotate(${rot}deg);z-index:${i}">`;
  }).join('');
  const live = document.createElement('a');
  live.className = 'pcard live';
  live.href = './fengwei.html';
  live.innerHTML =
    `<div class="pc-covers">${fan}</div>
     <div class="pc-name">《风味人间》</div>
     <div class="pc-meta">${seasonCount} 季 · ${epCount} 集 · ${ds.length} 道美食</div>
     <div class="pc-go">进入地图 →</div>`;
  grid.appendChild(live);

  // 即将上线
  [
    {name:'《我的美食向导》', tint:'#5b8fb0'},
    {name:'《舌尖上的中国》', tint:'#7a4a2c'},
  ].forEach(s=>{
    const c = document.createElement('div');
    c.className = 'pcard soon';
    c.innerHTML =
      `<span class="pc-soon-tag">即将上线</span>
       <div class="pc-poster" style="--tint:${s.tint}">${s.name}</div>
       <div class="pc-name">${s.name}</div>
       <div class="pc-meta">敬请期待</div>`;
    grid.appendChild(c);
  });

  // 占位
  const ghost = document.createElement('div');
  ghost.className = 'pcard ghost';
  ghost.textContent = '更多节目陆续加入…';
  grid.appendChild(ghost);
}

/* ---------- 滚动进场 ---------- */
function initReveals(){
  const els = document.querySelectorAll('.reveal');
  if(reduce){ els.forEach(el=>el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }
  }, {threshold:0.18});
  els.forEach(el=>io.observe(el));
}

/* ---------- 数字 count-up（进入视口触发一次） ---------- */
function initCountUp(){
  const grid = $('#statsGrid');
  const run = ()=> grid.querySelectorAll('.num').forEach(el=>animateNum(el, +el.dataset.target));
  if(reduce){ grid.querySelectorAll('.num').forEach(el=>el.textContent = el.dataset.target); return; }
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){ if(e.isIntersecting){ run(); io.disconnect(); break; } }
  }, {threshold:0.4});
  io.observe(grid);
}
function animateNum(el, target, dur=1200){
  const t0 = performance.now();
  const step = (t)=>{
    const p = Math.min(1, (t-t0)/dur);
    const eased = 1 - Math.pow(1-p, 3); // easeOutCubic
    el.textContent = Math.round(eased*target);
    if(p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
