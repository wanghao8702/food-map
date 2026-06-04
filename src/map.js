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
};

// 像素空间防重叠：距离 < min 的点对相互推开(处理太湖/苏州这类近邻)。
function pixelSpread(list, min=22){
  const out=list.map(o=>({...o}));
  for(let i=0;i<out.length;i++) for(let j=i+1;j<out.length;j++){
    const a=out[i], b=out[j]; let dx=b.x-a.x, dy=b.y-a.y, dist=Math.hypot(dx,dy)||0.01;
    if(dist<min){ const push=(min-dist)/2, ux=dx/dist, uy=dy/dist;
      a.x-=ux*push; a.y-=uy*push; b.x+=ux*push; b.y+=uy*push; }
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
const WORLD_REGION = { 'fw1-01-iberico':'ES', 'fw1-01-aligot':'FR', 'fw1-01-holland-crab':'NL' };
function regionCenter(id){
  const p = svg.querySelector('path[id="'+id+'"]');
  if(!p) return null;
  const b = p.getBBox();
  return { x:b.x+b.width/2, y:b.y+b.height/2 };
}
function pinAt(d,cx,cy){
  const p=el('circle',{cx,cy,r:7,class:'pin','data-id':d.id});
  p.addEventListener('click',()=>onPick(d));
  const t=el('title',{}); t.textContent=d.name; p.appendChild(t);
  svg.appendChild(p);
}
export async function renderWorld(){
  await setBase(WORLD); back.hidden=true;
  store.world.forEach(d=>{ const c=regionCenter(WORLD_REGION[d.id]); c ? pinAt(d,c.x,c.y) : pinAt(d, ...Object.values(project(d.lng,d.lat,WORLD))); });
  const cn=regionCenter('CN');
  const {x,y}= cn || project(105,36,WORLD);
  const g=el('g',{class:'cluster'});
  g.appendChild(el('circle',{cx:x,cy:y,r:20}));
  const label=el('text',{x,y:y-2,'text-anchor':'middle'}); label.textContent='中国';
  const cnt=el('text',{x,y:y+12,'text-anchor':'middle',class:'cnt'}); cnt.textContent=store.china.length+'道';
  g.append(label,cnt); g.addEventListener('click',renderChina); svg.appendChild(g);
}
export async function renderChina(){
  await setBase(CHINA); back.hidden=false;
  const list = store.china.map(d=>{ const px=CHINA_PX[d.id]; const p = px ? {x:px[0],y:px[1]} : project(d.lng,d.lat,CHINA); return {d, x:p.x, y:p.y}; });
  pixelSpread(list).forEach(o=>pinAt(o.d, o.x, o.y));
}
export function init(onPickCb){ onPick = onPickCb || onPick; }

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
