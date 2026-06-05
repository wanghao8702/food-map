import { loadData } from './data.js';
import { project } from './projection.js';

// 底图来自 svg-maps (MapSVG)。world 为 Miller 类投影、china 为圆锥投影 —— 经纬度线性投影只在中东部够准，
// 故海外钉按国家 path 中心放置；中国钉用下方校准过的像素坐标(见 CHINA_PX)。
const WORLD = { lngMin:-169.110266, lngMax:190.486279, latTop:83.600842, latBottom:-58.508473, width:1009.6727, height:665.96301, base:'./assets/world.svg' };
const CHINA = { lngMin:73.554302, lngMax:134.775703, latTop:53.561780, latBottom:18.155060, width:774.04419, height:569.65088, base:'./assets/china.svg' };
const svg = document.getElementById('map');
const back = document.getElementById('back');
let store, onPick = ()=>{};

const NS='http://www.w3.org/2000/svg';
function el(t,a){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;}

// 中国各菜在 china.svg(viewBox 774×569)用户坐标系下的精确像素位置。
// 由"仿射拟合各省中心 → 吸附到所在省份内"校准得到，逐一验证落在正确省份。
const CHINA_PX = {
  'fw1-01-dawei-yang':[189.3,122.2],   // 新疆·阿勒泰
  'fw1-01-naitong-rou':[577.1,118.2],  // 内蒙古·呼伦贝尔
  'fw1-01-xun-machang':[181.2,136.1],  // 新疆·乌伦古河
  'fw1-01-mizhi-huofang':[560.1,404.3],// 安徽·南屏村
  'fw1-01-nianzhuan':[493.4,327.7],    // 河南·孟津
  'fw1-01-yangyu-jiaotuan':[384.6,317.0],// 甘肃·临洮
  'fw1-01-longxu-sun':[372.4,406.2],   // 四川·瓦屋山
  'fw1-01-bachu-mogu':[66.9,247.3],    // 新疆·巴楚
  'fw1-01-taihu-dazhaxie':[589.5,383.2],// 江苏·太湖
  'fw1-01-tuhuangyou':[594.7,381.3],   // 江苏·苏州
  'fw1-01-sanbei-qiyu':[600.7,508.0],  // 中国台湾·台东
  // 第2集：澳门三道(CN-92 区块极小，仿射够不着)→ 取澳门附近，渲染时由 pixelSpread 散开
  'fw1-02-majiexiu-qiu':[504.0,515.0], // 澳门·马介休球
  'fw1-02-feizhou-ji':[507.0,517.0],   // 澳门·非洲鸡
  'fw1-02-tacho':[506.0,513.0],        // 澳门·Tacho
  'fw1-03-huzhou-yangrou':[603.0,407.0],// 浙江·湖州(贴苏浙界，置浙江纵深以抗防重叠位移)
  // 第4集：边界/小区/极西校准
  'fw1-04-pidan':[607.6,381.6],         // 上海·崇明(沪区极小)
  'fw1-04-meixiancaigeng':[601.2,398.0],// 浙江·宁波(贴沪界)
  'fw1-04-guoshou-mixian':[305.6,489.2],// 云南·德宏(极西南)
  'fw1-04-chaihui-yutou':[573.0,372.0], // 江苏·扬州(贴皖界)
  // 第5集：香港两道(CN-91 极小)→ 取香港附近，渲染时散开
  'fw1-05-chiyou-ji':[511.0,513.5],     // 香港·豉油鸡
  'fw1-05-huadiao-xiexie':[515.0,512.0],// 香港·花雕蒸花蟹
};

// china.svg 为圆锥投影。经"最小二乘拟合各省中心"得到的仿射变换(经纬度→像素)，
// 比单纯等距圆柱线性更准，作为没有 CHINA_PX 显式校准时的默认定位。
function chinaProject(lng,lat){
  return { x: 12.5924*lng + 0.2276*lat - 931.326,
           y: 0.0473*lng - 15.5677*lat + 862.9133 };
}

// 像素空间防重叠：距离 < min 的点对相互推开(处理太湖/苏州这类近邻)。
function pixelSpread(list, min=22){
  const out=list.map(o=>({...o}));
  for(let i=0;i<out.length;i++) for(let j=i+1;j<out.length;j++){
    const a=out[i], b=out[j]; let dx=b.x-a.x, dy=b.y-a.y, dist=Math.hypot(dx,dy);
    if(dist<min){
      let ux,uy;
      if(dist<0.5){ const ang=i*2.399+j; ux=Math.cos(ang); uy=Math.sin(ang); dist=0.01; } // 完全重合：按索引给确定方向
      else { ux=dx/dist; uy=dy/dist; }
      const push=(min-dist)/2;
      a.x-=ux*push; a.y-=uy*push; b.x+=ux*push; b.y+=uy*push;
    }
  }
  return out;
}

async function setBase(cfg){
  const txt = await (await fetch(cfg.base)).text();
  svg.innerHTML = '';
  // svg-maps 文件含 xml 声明/注释/多行 <svg> 包裹，正则不可靠；用 DOMParser 只提取 <path>。
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  const g = el('g',{class:'basemap'});
  doc.querySelectorAll('path').forEach(p=> g.appendChild(document.importNode(p,true)));
  svg.appendChild(g);
  resetView(cfg);
}

// 世界图海外钉按所在国家 path 几何中心放置。
const WORLD_REGION = {
  'fw1-01-iberico':'ES', 'fw1-01-aligot':'FR', 'fw1-01-holland-crab':'NL',
  'fw1-02-sangak':'IR', 'fw1-02-hainan-jifan':'MY', 'fw1-02-chifa-yuntun':'PE', 'fw1-02-mushu-wuhua':'PE',
  'fw1-03-tagine':'MA', 'fw1-03-juan-doufu':'JP',
  'fw1-04-herring':'SE', 'fw1-04-roquefort':'FR', 'fw1-04-yulu':'VN', 'fw1-04-bresi-ji':'FR',
  'fw1-05-cajun-crawfish':'US',
};
function regionCenter(id){
  const p = svg.querySelector('path[id="'+id+'"]');
  if(!p) return null;
  const b = p.getBBox();
  return { x:b.x+b.width/2, y:b.y+b.height/2 };
}
const PIN_R = 15;    // 衬底圆半径(用户单位)
const PIN_IMG = 28;  // 美食插画边长
function pinAt(d,cx,cy){
  const g=el('g',{class:'pin','data-id':d.id, transform:`translate(${cx},${cy})`});
  const inner=el('g',{class:'pin-inner'});
  inner.appendChild(el('circle',{r:PIN_R,class:'pin-bg'}));
  const img=el('image',{x:-PIN_IMG/2,y:-PIN_IMG/2,width:PIN_IMG,height:PIN_IMG,class:'pin-img'});
  img.setAttribute('href',`./assets/svg/${d.svg}`);
  img.setAttributeNS('http://www.w3.org/1999/xlink','href',`./assets/svg/${d.svg}`); // 老内核兼容
  inner.appendChild(img);
  g.appendChild(inner);
  const t=el('title',{}); t.textContent=d.name; g.appendChild(t);
  g.addEventListener('click',()=>onPick(d));
  svg.appendChild(g);
}
export async function renderWorld(){
  await setBase(WORLD); back.hidden=true;
  const wlist = store.world.map(d=>{ const c=regionCenter(WORLD_REGION[d.id]) || project(d.lng,d.lat,WORLD); return {d, x:c.x, y:c.y}; });
  pixelSpread(wlist, 26).forEach(o=>pinAt(o.d, o.x, o.y));
  const cn=regionCenter('CN');
  const {x,y}= cn || project(105,36,WORLD);
  svg.appendChild(clusterMarker(x,y,store.china));
}

// 「中国」汇总点：多张代表美食插画聚成一个集合(中心+环绕) + 数量徽标。
function clusterMarker(x,y,china){
  const want=['taihu-dazhaxie.svg','mizhi-huofang.svg','dawei-yang.svg','xun-machang.svg','tuhuangyou.svg','longxu-sun.svg','bachu-mogu.svg','naitong-rou.svg'];
  const have=new Set(china.map(d=>d.svg));
  let reps=want.filter(s=>have.has(s));
  for(const s of china.map(d=>d.svg)) if(!reps.includes(s)) reps.push(s);
  reps=reps.slice(0, Math.max(5, Math.min(7, reps.length)));   // 5–7 张
  const g=el('g',{class:'cluster', transform:`translate(${x},${y})`});
  const inner=el('g',{class:'cl-inner'});
  const n=reps.length, R=15;
  const pos=[{x:0,y:0}];                                        // 中心
  for(let i=0;i<n-1;i++){ const a=-Math.PI/2 + i*(2*Math.PI/(n-1)); pos.push({x:Math.cos(a)*R, y:Math.sin(a)*R}); }
  const disc=(o,svgName)=>{
    const d=el('g',{transform:`translate(${o.x},${o.y})`});
    d.appendChild(el('circle',{r:11,class:'cl-disc'}));
    const img=el('image',{x:-9,y:-9,width:18,height:18,class:'pin-img'});
    img.setAttribute('href',`./assets/svg/${svgName}`);
    img.setAttributeNS('http://www.w3.org/1999/xlink','href',`./assets/svg/${svgName}`);
    d.appendChild(img); inner.appendChild(d);
  };
  for(let i=1;i<n;i++) disc(pos[i], reps[i]);                   // 先画环绕
  disc(pos[0], reps[0]);                                        // 中心最后(在最上)
  // 数量徽标(右上)
  const badge=el('g',{class:'cl-badge', transform:'translate(22,-22)'});
  badge.appendChild(el('circle',{r:11}));
  const bt=el('text',{y:4,'text-anchor':'middle'}); bt.textContent=china.length; badge.appendChild(bt);
  inner.appendChild(badge);
  g.appendChild(inner);
  const tip=el('title',{}); tip.textContent=`中国 · ${china.length} 道风味(点击展开)`; g.appendChild(tip);
  g.addEventListener('click',renderChina);
  return g;
}
// 落地保障：防重叠后若有点落在海里(不在任何省内)，就近吸附回最近陆地，避免图钉浮海。
function ensureOnLand(list){
  const provs=[...svg.querySelectorAll('.basemap path')].filter(p=>/^CN-/.test(p.id));
  const inAny=(x,y)=>provs.some(p=>{try{return p.isPointInFill(new DOMPoint(x,y));}catch(e){return false;}});
  for(const o of list){ if(inAny(o.x,o.y)) continue;
    outer: for(let r=2;r<=40;r+=2) for(let a=0;a<360;a+=20){ const nx=o.x+r*Math.cos(a*Math.PI/180), ny=o.y+r*Math.sin(a*Math.PI/180); if(inAny(nx,ny)){ o.x=nx; o.y=ny; break outer; } }
  }
}
export async function renderChina(){
  await setBase(CHINA); back.hidden=false;
  const list = store.china.map(d=>{ const px=CHINA_PX[d.id]; const p = px ? {x:px[0],y:px[1]} : chinaProject(d.lng,d.lat); return {d, x:p.x, y:p.y}; });
  const placed = pixelSpread(list);
  ensureOnLand(placed);
  placed.forEach(o=>pinAt(o.d, o.x, o.y));
}
export function init(onPickCb){ onPick = onPickCb || onPick; }

/* ---------- 风味连接视图：单集内、按地理铺开、主题彩色弧线 ---------- */
export function getEpisodes(){
  const seen={}, out=[];
  for(const d of store.all){ const k=d.season+'-'+d.episode; if(!seen[k]){ seen[k]=1; out.push({season:d.season,episode:d.episode,title:d.episodeTitle}); } }
  return out.sort((a,b)=> a.season-b.season || a.episode-b.episode);
}
const _epCache={};
async function loadEpData(season,episode){ const key=`fw${season}-${String(episode).padStart(2,'0')}`; if(!_epCache[key]) _epCache[key]=await (await fetch(`./episodes/${key}.json`)).json(); return _epCache[key]; }
// world.svg 为 Miller 投影。中国菜定位：经纬度在中国地理范围内线性映射到 world 的 CN path 包围盒(近似)。
const CN_GEO={lngMin:73.554302,lngMax:134.775703,latTop:53.561780,latBottom:18.155060};
function worldPixel(d){
  const c=regionCenter(WORLD_REGION[d.id]); if(c) return c;
  const cn=svg.querySelector('path[id="CN"]');
  if(cn){ const b=cn.getBBox();
    return { x:b.x+(d.lng-CN_GEO.lngMin)/(CN_GEO.lngMax-CN_GEO.lngMin)*b.width,
             y:b.y+(CN_GEO.latTop-d.lat)/(CN_GEO.latTop-CN_GEO.latBottom)*b.height }; }
  return project(d.lng,d.lat,WORLD);
}
const THEME_PALETTE=['#D97757','#C9822F','#7C9A6B','#9A6BA8','#3F8B8B','#B3543C','#5E7CA8','#B58A2E'];
function arcD(A,B){
  const dx=B.x-A.x, dy=B.y-A.y, len=Math.hypot(dx,dy)||1;
  const off=Math.min(140, Math.max(30, len*0.22)), mx=(A.x+B.x)/2, my=(A.y+B.y)/2, nx=-dy/len, ny=dx/len;
  return `M${A.x},${A.y} Q${mx+nx*off},${my+ny*off} ${B.x},${B.y}`;
}
export async function renderConnections(season,episode){
  await setBase(WORLD); back.hidden=true;
  const data=await loadEpData(season,episode);
  const links=data.links||[];
  const dishes=store.all.filter(d=>d.season===season && d.episode===episode);
  const spread=pixelSpread(dishes.map(d=>({d,...worldPixel(d)})), 26);
  const posById={}; spread.forEach(o=>posById[o.d.id]=o);
  const tc={}; let ti=0;
  for(const lk of links) if(!(lk.theme in tc)) tc[lk.theme]=THEME_PALETTE[ti++ % THEME_PALETTE.length];
  const L=document.getElementById('conn-label');
  const setHL=(theme)=>{
    arcs.querySelectorAll('.arc').forEach(a=>{ a.classList.toggle('hl', a.dataset.theme===theme); a.classList.toggle('dim', !!theme && a.dataset.theme!==theme); });
    if(L){ if(theme){ L.textContent=theme; L.style.background=tc[theme]; L.hidden=false; } else L.hidden=true; }
  };
  const arcs=el('g',{class:'arc-layer'}); svg.appendChild(arcs);
  links.forEach(lk=>{ const A=posById[lk.a], B=posById[lk.b]; if(!A||!B) return;
    const d=arcD(A,B);
    const hit=el('path',{class:'arc-hit', d}); arcs.appendChild(hit);
    const arc=el('path',{class:'arc', d, 'data-theme':lk.theme, stroke:tc[lk.theme]}); arcs.appendChild(arc);
    hit.addEventListener('mouseenter',()=>setHL(lk.theme));
    hit.addEventListener('mouseleave',()=>setHL(null));
    hit.addEventListener('click',()=>setHL(lk.theme));
  });
  spread.forEach(o=>pinAt(o.d,o.x,o.y));   // 节点在弧线之上
}

/* ---------- 平移 / 缩放(操作 viewBox，钉与底图一起变换) ---------- */
let vb={x:0,y:0,w:0,h:0}, baseW=0, baseH=0;
function applyVB(){ svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); }
function resetView(cfg){ baseW=cfg.width; baseH=cfg.height; vb={x:0,y:0,w:cfg.width,h:cfg.height}; applyVB(); }
function clampPan(){
  vb.x=Math.min(Math.max(vb.x, -vb.w*0.25), baseW - vb.w*0.75);
  vb.y=Math.min(Math.max(vb.y, -vb.h*0.25), baseH - vb.h*0.75);
}
function clientToUser(cx,cy){ const pt=svg.createSVGPoint(); pt.x=cx; pt.y=cy; return pt.matrixTransform(svg.getScreenCTM().inverse()); }

svg.addEventListener('wheel', e=>{
  e.preventDefault();
  const p=clientToUser(e.clientX,e.clientY);
  const scale = e.deltaY>0 ? 1.15 : 1/1.15;          // 向下滚=缩小
  let nw=Math.min(baseW, Math.max(baseW/10, vb.w*scale));
  const k=nw/vb.w;
  vb.x = p.x - (p.x - vb.x)*k;
  vb.y = p.y - (p.y - vb.y)*k;
  vb.w = nw; vb.h = vb.h*k;
  clampPan(); applyVB();
}, {passive:false});

let panning=false, moved=false, last=null;
svg.addEventListener('pointerdown', e=>{ if(e.button!==0)return; panning=true; moved=false; last={x:e.clientX,y:e.clientY}; });
window.addEventListener('pointermove', e=>{
  if(!panning)return;
  const dx=e.clientX-last.x, dy=e.clientY-last.y;
  if(!moved && Math.hypot(dx,dy)<3) return;           // <3px 视为点击，不平移(保护图钉点击)
  moved=true; svg.style.cursor='grabbing';
  const m=svg.getScreenCTM();
  vb.x-=dx/m.a; vb.y-=dy/m.d; last={x:e.clientX,y:e.clientY};
  clampPan(); applyVB();
});
window.addEventListener('pointerup', ()=>{ panning=false; svg.style.cursor=''; });
svg.addEventListener('dblclick', ()=>{ vb={x:0,y:0,w:baseW,h:baseH}; applyVB(); });  // 双击复位

back.addEventListener('click',renderWorld);
loadData().then(s=>{ store=s; renderWorld(); });
