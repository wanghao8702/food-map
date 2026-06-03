import { loadData } from './data.js';
import { project } from './projection.js';

const WORLD = { lngMin:-180, lngMax:180, latTop:85, latBottom:-60, width:1000, height:500, base:'./assets/world-map.svg' };
const CHINA = { lngMin:73, lngMax:135, latTop:54, latBottom:18, width:1000, height:500, base:'./assets/china-map.svg' };
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
  svg.innerHTML = '';
  const g = el('g',{}); g.innerHTML = txt.replace(/<\/?svg[^>]*>/g,''); svg.appendChild(g);
}
function pin(d,cfg){
  const {x,y}=project(d.lng,d.lat,cfg);
  const cx=x+(d._dx||0), cy=y+(d._dy||0);
  const p=el('circle',{cx,cy,r:7,class:'pin','data-id':d.id});
  p.addEventListener('click',()=>onPick(d));
  const t=el('title',{}); t.textContent=d.name; p.appendChild(t);
  svg.appendChild(p);
}
export async function renderWorld(){
  await setBase(WORLD); back.hidden=true;
  store.world.forEach(d=>pin(d,WORLD));
  const {x,y}=project(105,36,WORLD);
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
