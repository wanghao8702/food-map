import { loadData } from './data.js';
import { project } from './projection.js';

// 底图来自 svg-maps (MapSVG)，等距圆柱投影。配置取自各文件的 mapsvg:geoViewBox(W N E S)与像素 width/height。
const WORLD = { lngMin:-169.110266, lngMax:190.486279, latTop:83.600842, latBottom:-58.508473, width:1009.6727, height:665.96301, base:'./assets/world.svg' };
const CHINA = { lngMin:73.554302, lngMax:134.775703, latTop:53.561780, latBottom:18.155060, width:774.04419, height:569.65088, base:'./assets/china.svg' };
const svg = document.getElementById('map');
const back = document.getElementById('back');
let store, onPick = ()=>{};

const NS='http://www.w3.org/2000/svg';
function el(t,a){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;}

function spread(list){
  // 把经纬度近邻（约 1.67° 桶）的点视为重叠组；同组成员沿圆环均匀外推，避免针脚相互覆盖。
  const key=d=>Math.round(d.lng*0.6)+','+Math.round(d.lat*0.6); // 例：太湖/苏州 落入同一桶
  const total={};
  list.forEach(d=>{const k=key(d); total[k]=(total[k]||0)+1;});
  const seen={};
  return list.map(d=>{const k=key(d);
    const n=(seen[k]=(seen[k]||0)+1)-1, c=total[k];
    if(c<2) return {...d, _dx:0, _dy:0};
    const r=9*Math.min(c,3)/2, ang=(n/c)*Math.PI*2 + 0.6; // 同组成员各占一个角度槽，整体外推
    return {...d, _dx:Math.cos(ang)*r, _dy:Math.sin(ang)*r};});
}

async function setBase(cfg){
  const txt = await (await fetch(cfg.base)).text();
  svg.setAttribute('viewBox', `0 0 ${cfg.width} ${cfg.height}`);
  svg.innerHTML = '';
  // svg-maps 文件含 xml 声明/注释/多行 <svg> 包裹，正则不可靠；用 DOMParser 只提取 <path>。
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  const g = el('g',{class:'basemap'});
  doc.querySelectorAll('path').forEach(p=> g.appendChild(document.importNode(p,true)));
  svg.appendChild(g);
}
// 世界图(svg-maps 为 Miller 类投影，线性 project 不准)→ 海外钉按所在国家 path 几何中心放置。
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
function pin(d,cfg){
  const {x,y}=project(d.lng,d.lat,cfg);
  pinAt(d, x+(d._dx||0), y+(d._dy||0));
}
export async function renderWorld(){
  await setBase(WORLD); back.hidden=true;
  store.world.forEach(d=>{ const c=regionCenter(WORLD_REGION[d.id]); c ? pinAt(d,c.x,c.y) : pin(d,WORLD); });
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
  spread(store.china).forEach(d=>pin(d,CHINA));
}
export function init(onPickCb){ onPick = onPickCb || onPick; }

back.addEventListener('click',renderWorld);
loadData().then(s=>{ store=s; renderWorld(); });
