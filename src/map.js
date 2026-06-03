import { loadData } from './data.js';
import { project } from './projection.js';

const WORLD = { lngMin:-180, lngMax:180, latTop:85, latBottom:-60, width:1000, height:500, base:'./assets/world-map.svg' };
const CHINA = { lngMin:73, lngMax:135, latTop:54, latBottom:18, width:1000, height:500, base:'./assets/china-map.svg' };
const svg = document.getElementById('map');
const back = document.getElementById('back');
let store, onPick = ()=>{};

const NS='http://www.w3.org/2000/svg';
function el(t,a){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;}

async function setBase(cfg){
  const txt = await (await fetch(cfg.base)).text();
  svg.innerHTML = '';
  const g = el('g',{}); g.innerHTML = txt.replace(/<\/?svg[^>]*>/g,''); svg.appendChild(g);
}
function pin(d,cfg){
  const {x,y}=project(d.lng,d.lat,cfg);
  const p=el('circle',{cx:x,cy:y,r:7,class:'pin','data-id':d.id});
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
  store.china.forEach(d=>pin(d,CHINA));
}
export function init(onPickCb){ onPick = onPickCb || onPick; }

back.addEventListener('click',renderWorld);
loadData().then(s=>{ store=s; renderWorld(); });
