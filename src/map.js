import { loadData } from './data.js';
import { project } from './projection.js';
import { WORLD_GEO, worldMerc } from './worldproj.js';
import { COUNTRY_NAME, CHINA_PX, WORLD_REGION } from './geodata.js';

// 底图来自 svg-maps (MapSVG)。world 为 Miller 类投影、china 为圆锥投影 —— 经纬度线性投影只在中东部够准，
// 故海外钉按国家 path 中心放置；中国钉用 geodata.js 中校准过的像素坐标(CHINA_PX)。
const WORLD = { ...WORLD_GEO, base:'./assets/world.svg' };
const CHINA = { lngMin:73.554302, lngMax:134.775703, latTop:53.561780, latBottom:18.155060, width:774.04419, height:569.65088, base:'./assets/china.svg' };
const svg = document.getElementById('map');
const back = document.getElementById('back');
let store, onPick = ()=>{}, onConn = ()=>{};

// 季/集筛选：null = 全部。curBase 记录当前底图(world/china)，供筛选后就地重绘。
let scope = { season:null, episode:null };
let curBase = 'world';
let chinaZoom = null;   // 省份放大态：记录当前放大的省名(null=中国全图)
let showMinor = false;  // 是否显示「只短暂出现」的菜(minor)；默认隐藏，减少图上拥挤
let _rerender = ()=>renderWorld();   // 当前视图的重绘闭包，供 setShowMinor 调用
function inScope(d){ return (showMinor || !d.minor) && (scope.season==null || d.season===scope.season) && (scope.episode==null || d.episode===scope.episode); }
export function setShowMinor(v){ showMinor = !!v; _rerender(); }
export function setScope(season, episode){
  scope = { season: season==null?null:season, episode: episode==null?null:episode };
  if(curBase==='china') renderChina(); else renderWorld();
}

const NS='http://www.w3.org/2000/svg';
function el(t,a){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;}

// 由 region 取省/直辖市/特区名(用于中国近景的省级聚合)。
function provinceOf(d){
  const r=d.region||'';
  if(/香港/.test(r)) return '香港';
  if(/澳门/.test(r)) return '澳门';
  if(/台湾/.test(r)) return '台湾';
  if(/^北京/.test(r)) return '北京';
  if(/^上海/.test(r)) return '上海';
  if(/^重庆/.test(r)) return '重庆';
  if(/^天津/.test(r)) return '天津';
  return r.split('·')[0].replace(/^中国/,'') || r;
}

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

// 解析后的底图 <g class="basemap"> 模板缓存：避免每次世界↔中国切换都重新 fetch + DOMParser。
// 模板自身从不入 DOM，每次 setBase 克隆一份新节点(getBBox/isPointInFill 仍作用于渲染中的克隆，与原行为一致)。
const _baseCache = {};
async function setBase(cfg){
  let tmpl = _baseCache[cfg.base];
  if(!tmpl){
    const txt = await (await fetch(cfg.base)).text();
    // svg-maps 文件含 xml 声明/注释/多行 <svg> 包裹，正则不可靠；用 DOMParser 只提取 <path>。
    const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
    tmpl = el('g',{class:'basemap'});
    doc.querySelectorAll('path').forEach(p=> tmpl.appendChild(document.importNode(p,true)));
    _baseCache[cfg.base] = tmpl;
  }
  svg.innerHTML = '';
  svg.appendChild(tmpl.cloneNode(true));
  resetView(cfg);
}

function regionCenter(id){
  const p = svg.querySelector('path[id="'+id+'"]');
  if(!p) return null;
  const b = p.getBBox();
  return { x:b.x+b.width/2, y:b.y+b.height/2 };
}
const PIN_R = 12;    // 衬底圆半径(用户单位)
const PIN_IMG = 22;  // 美食插画边长
function pinAt(d,cx,cy){
  const g=el('g',{class:'pin','data-id':d.id,'data-x':cx,'data-y':cy, transform:`translate(${cx},${cy})`,
    tabindex:'0', role:'button', 'aria-label':`${d.name}，${d.region}`});
  const inner=el('g',{class:'pin-inner'});
  inner.appendChild(el('circle',{r:PIN_R,class:'pin-bg'}));
  const img=el('image',{x:-PIN_IMG/2,y:-PIN_IMG/2,width:PIN_IMG,height:PIN_IMG,class:'pin-img'});
  img.setAttribute('href',`./assets/svg/${d.svg}`);
  img.setAttributeNS('http://www.w3.org/1999/xlink','href',`./assets/svg/${d.svg}`); // 老内核兼容
  inner.appendChild(img);
  g.appendChild(inner);
  const t=el('title',{}); t.textContent=d.name; g.appendChild(t);
  g.addEventListener('click',()=>onPick(d, g));
  g.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onPick(d, g); } });
  svg.appendChild(g);
}
// 通用小聚合气泡：多张代表插画(中心+环绕)+ 数量徽标；点击执行 onClick(用于「就地散开」)。
function miniCluster(x,y,dishes,labelText,onClick){
  const reps=dishes.map(d=>d.svg).slice(0, Math.min(6, dishes.length));
  const g=el('g',{class:'cluster', transform:`translate(${x},${y})`,
    tabindex:'0', role:'button', 'aria-label':`${labelText}，点击展开`});
  const inner=el('g',{class:'cl-inner'});
  const n=reps.length, R=12;
  const ps=[{x:0,y:0}];
  for(let i=0;i<n-1;i++){ const a=-Math.PI/2 + i*(2*Math.PI/(n-1)); ps.push({x:Math.cos(a)*R, y:Math.sin(a)*R}); }
  const disc=(o,svgName)=>{
    const d=el('g',{transform:`translate(${o.x},${o.y})`});
    d.appendChild(el('circle',{r:9,class:'cl-disc'}));
    const img=el('image',{x:-7,y:-7,width:14,height:14,class:'pin-img'});
    img.setAttribute('href',`./assets/svg/${svgName}`);
    img.setAttributeNS('http://www.w3.org/1999/xlink','href',`./assets/svg/${svgName}`);
    d.appendChild(img); inner.appendChild(d);
  };
  for(let i=1;i<n;i++) disc(ps[i], reps[i]);
  disc(ps[0], reps[0]);
  const badge=el('g',{class:'cl-badge', transform:'translate(16,-16)'});
  badge.appendChild(el('circle',{r:9}));
  const bt=el('text',{y:3.5,'text-anchor':'middle'}); bt.textContent=dishes.length; badge.appendChild(bt);
  inner.appendChild(badge);
  g.appendChild(inner);
  const tip=el('title',{}); tip.textContent=`${labelText}（点击展开）`; g.appendChild(tip);
  g.addEventListener('click',()=>onClick(g));
  g.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onClick(g); } });
  return g;
}
// 把某国家的菜从聚合气泡散开成独立图钉(国家中心 seed + 防重叠)。renderWorld 与 focusDish 共用。
function expandCountry(cx,cy,dishes){
  const seeded=dishes.map((d,i)=>({d, x:cx+Math.cos(i*2.399)*0.1, y:cy+Math.sin(i*2.399)*0.1}));
  pixelSpread(seeded,24).forEach(o=>pinAt(o.d,o.x,o.y));
}
export async function renderWorld(expandIso=null){
  _rerender=renderWorld;
  await setBase(WORLD); curBase='world'; back.hidden=true; chinaZoom=null; hideOverlayLabel();
  // 海外按国家分组：<5 道直接散开画钉，≥5 道画「国家·N道」气泡；中国整体一枚聚合气泡。
  const world = store.world.filter(inScope);
  const byCountry={};
  world.forEach(d=>{ const iso=WORLD_REGION[d.id]||'??'; (byCountry[iso]=byCountry[iso]||[]).push(d); });
  const items=[];
  for(const iso in byCountry){
    const dishes=byCountry[iso];
    const c=regionCenter(iso) || project(dishes[0].lng,dishes[0].lat,WORLD);
    items.push({kind:'country', iso, dishes, x:c.x, y:c.y});
  }
  const china=store.china.filter(inScope);
  if(china.length){
    const cn=regionCenter('CN'); const {x,y}= cn || project(105,36,WORLD);
    items.push({kind:'china', dishes:china, x, y});
  }
  // 先把相邻国家锚点推开，避免邻国(英/荷/德等)钉子互相重叠。
  pixelSpread(items, 26).forEach(it=>{
    if(it.kind==='china'){ svg.appendChild(clusterMarker(it.x,it.y,it.dishes)); return; }
    const cx=it.x, cy=it.y, dishes=it.dishes;
    if(dishes.length < 5 || it.iso===expandIso){   // <5 道或被指定展开：散开图钉
      expandCountry(cx,cy,dishes);
      return;
    }
    // ≥5 道：聚合成「国家·N道」气泡，点击就地展开
    const label=(COUNTRY_NAME[it.iso]||it.iso)+' · '+dishes.length+'道';
    svg.appendChild(miniCluster(cx,cy,dishes,label,(g)=>{ g.remove(); expandCountry(cx,cy,dishes); }));
  });
}

// 「中国」汇总点：多张代表美食插画聚成一个集合(中心+环绕) + 数量徽标。
function clusterMarker(x,y,china){
  const want=['taihu-dazhaxie.svg','mizhi-huofang.svg','dawei-yang.svg','xun-machang.svg','tuhuangyou.svg','longxu-sun.svg','bachu-mogu.svg','naitong-rou.svg'];
  const have=new Set(china.map(d=>d.svg));
  let reps=want.filter(s=>have.has(s));
  for(const s of china.map(d=>d.svg)) if(!reps.includes(s)) reps.push(s);
  reps=reps.slice(0, Math.max(5, Math.min(7, reps.length)));   // 5–7 张
  const g=el('g',{class:'cluster', transform:`translate(${x},${y})`,
    tabindex:'0', role:'button', 'aria-label':`中国 · ${china.length} 道风味，点击展开`});
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
  g.addEventListener('click',()=>animateSwap(renderChina,'in'));
  g.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); animateSwap(renderChina,'in'); } });
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
const chinaPos = d => { const px=CHINA_PX[d.id]; return px ? {x:px[0],y:px[1]} : chinaProject(d.lng,d.lat); };
export async function renderChina(){
  _rerender=renderChina;
  await setBase(CHINA); curBase='china'; back.hidden=false; chinaZoom=null; back.textContent='← 返回世界'; hideOverlayLabel();
  // 按省/直辖市/特区聚合：1 道直接画钉，≥2 道画「省·N道」气泡，点击就地散开省内各菜。
  const china=store.china.filter(inScope);
  const byProv={};
  china.forEach(d=>{ const p=provinceOf(d); (byProv[p]=byProv[p]||[]).push(d); });
  for(const prov in byProv){
    const dishes=byProv[prov];
    if(dishes.length < 5){              // <5 道：不聚合，直接把各菜散开成图钉
      const placed=dishes.map(d=>({d, ...chinaPos(d)}));
      const sp=pixelSpread(placed); ensureOnLand(sp);
      sp.forEach(o=>pinAt(o.d,o.x,o.y)); continue;
    }
    // ≥5 道：聚合成「省·N道」气泡，点击放大该省
    let ax=0, ay=0; dishes.forEach(d=>{ const p=chinaPos(d); ax+=p.x; ay+=p.y; }); ax/=dishes.length; ay/=dishes.length;
    const anchor=[{x:ax,y:ay}]; ensureOnLand(anchor);
    svg.appendChild(miniCluster(anchor[0].x,anchor[0].y,dishes, prov+' · '+dishes.length+'道', ()=>drillProvince(prov, dishes)));
  }
}

// 一组散开点的包围盒 → viewBox(加留白，下限 MIN 防只有两三道菜时过度放大)。drillProvince 与 focusDish 共用。
function provinceViewBox(sp){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  sp.forEach(o=>{ minX=Math.min(minX,o.x); minY=Math.min(minY,o.y); maxX=Math.max(maxX,o.x); maxY=Math.max(maxY,o.y); });
  let w=maxX-minX, h=maxY-minY;
  const padX=Math.max(40, w*0.45), padY=Math.max(40, h*0.45);
  minX-=padX; minY-=padY; w+=padX*2; h+=padY*2;
  const MIN=170;
  if(w<MIN){ const c=minX+w/2; w=MIN; minX=c-w/2; }
  if(h<MIN){ const c=minY+h/2; h=MIN; minY=c-h/2; }
  return {x:minX,y:minY,w,h};
}
// 省份钻取：放大该省 → 散开省内各菜。落位用各菜校准坐标的包围盒(加留白)，动画缩放 viewBox。
async function drillProvince(prov, dishes){
  const placed = dishes.map(d=>({d, ...chinaPos(d)}));
  const sp = pixelSpread(placed); ensureOnLand(sp);
  const vbT = provinceViewBox(sp);
  // 清掉中国全图的气泡/图钉，只画该省的散开图钉
  svg.querySelectorAll('.pin,.cluster').forEach(e=>e.remove());
  sp.forEach(o=>pinAt(o.d,o.x,o.y));
  chinaZoom = prov;
  back.textContent = '← 返回中国';
  showOverlayLabel(prov + ' · ' + dishes.length + '道');
  await animateVB(vbT);
}
async function exitProvince(){
  await animateVB({x:0,y:0,w:baseW,h:baseH});
  renderChina();   // 重绘中国全图气泡(内部会重置 chinaZoom/按钮/标签)
}

// 顶部居中浮层标签(复用 #conn-label)：省份放大态显示省名。
function showOverlayLabel(text){
  const L=document.getElementById('conn-label');
  if(!L) return;
  L.textContent=text; L.style.background='var(--accent)'; L.hidden=false;
}
function hideOverlayLabel(){ const L=document.getElementById('conn-label'); if(L) L.hidden=true; }
// 钻取/返回切换动画：旧图缩放淡出 → 重绘 → 新图反向缩放淡入。
// mode='in'(进入中国近景，放大感) / 'out'(返回世界，缩小感)。
let _swapping=false;
async function animateSwap(run, mode){
  if(_swapping) return; _swapping=true;
  const leave = mode==='in' ? 'anim-leave-in' : 'anim-leave-out';
  const enter = mode==='in' ? 'anim-enter-in' : 'anim-enter-out';
  svg.classList.add(leave);
  await new Promise(r=>setTimeout(r,200));      // 等淡出结束(leave 用 forwards 保持终态)
  await run();                                   // 重绘期间仍保持 leave 终态，避免闪烁
  svg.classList.remove(leave); svg.classList.add(enter);   // 同步切换，无中间帧
  setTimeout(()=>{ svg.classList.remove(enter); _swapping=false; }, 300);
}

export function init(onPickCb, onConnCb){ onPick = onPickCb || onPick; onConn = onConnCb || onConn; }

/* ---------- 搜索定位：飞到某道菜的图钉、高亮并打开详情面板 ---------- */
export function getAllDishes(){ return store ? store.all.slice() : []; }
let _focusedId = null;
function clearFocus(){ svg.querySelectorAll('.pin.pin-focus').forEach(p=>p.classList.remove('pin-focus')); _focusedId=null; }
// 高亮目标图钉、置顶、并打开详情面板(复用 onPick=openPanel)。
function focusPin(d){
  clearFocus();
  const p=svg.querySelector('.pin[data-id="'+d.id+'"]');
  if(!p) return;
  p.classList.add('pin-focus'); _focusedId=d.id;
  svg.appendChild(p);              // 置于最上层
  onPick(d, p);
}
// 把视野对准 (cx,cy)，viewBox 宽 w(高按底图比例)，并夹在底图范围内。
async function focusPanTo(cx,cy,w){
  const h = w * (baseH/baseW || 0.66);
  let x=cx-w/2, y=cy-h/2;
  x=Math.max(-w*0.1, Math.min(x, baseW-w*0.9));
  y=Math.max(-h*0.1, Math.min(y, baseH-h*0.9));
  await animateVB({x,y,w,h});
}
// 跳转到某道菜：取消季/集筛选、临时含 minor 以保证目标可渲染，再按 scope 走中国/世界两条定位路径。
export async function focusDish(id){
  if(!store) return;
  const d=store.all.find(x=>x.id===id); if(!d) return;
  scope={season:null,episode:null};
  const savedMinor=showMinor; showMinor=true;
  if(d.scope==='china') await focusChinaDish(d); else await focusWorldDish(d);
  showMinor=savedMinor;
}
async function focusChinaDish(d){
  _rerender=renderChina;
  if(curBase!=='china'){ await setBase(CHINA); curBase='china'; }
  back.hidden=false;
  const prov=provinceOf(d);
  const dishes=store.china.filter(x=>provinceOf(x)===prov);
  const placed=dishes.map(x=>({d:x, ...chinaPos(x)}));
  const sp=pixelSpread(placed); ensureOnLand(sp);
  const vbT=provinceViewBox(sp);
  svg.querySelectorAll('.pin,.cluster,.arc-layer').forEach(e=>e.remove());
  sp.forEach(o=>pinAt(o.d,o.x,o.y));
  chinaZoom=prov; back.textContent='← 返回中国';
  showOverlayLabel(prov+' · '+dishes.length+'道');
  await animateVB(vbT);
  focusPin(d);
}
async function focusWorldDish(d){
  await renderWorld(WORLD_REGION[d.id]||'??');     // 世界全图，但把目标国家预先展开成图钉
  const p=svg.querySelector('.pin[data-id="'+d.id+'"]');
  if(p) await focusPanTo(+p.getAttribute('data-x'), +p.getAttribute('data-y'), Math.max(180, baseW*0.26));
  focusPin(d);
}

/* ---------- 风味连接视图：单集内、按地理铺开、主题彩色弧线 ---------- */
export function getEpisodes(){
  const seen={}, out=[];
  for(const d of store.all){ const k=d.season+'-'+d.episode; if(!seen[k]){ seen[k]=1; out.push({season:d.season,episode:d.episode,title:d.episodeTitle}); } }
  return out.sort((a,b)=> a.season-b.season || a.episode-b.episode);
}
const _epCache={};
async function loadEpData(season,episode){ const key=`fw${season}-${String(episode).padStart(2,'0')}`; if(!_epCache[key]) _epCache[key]=await (await fetch(`./episodes/${key}.json`)).json(); return _epCache[key]; }
// world.svg 用 Mercator 投影(x 线性经度、y 对数纬度)。直接用 Mercator 公式定位，比 CN bbox 线性插值更准。
function worldPixel(d){
  const c=regionCenter(WORLD_REGION[d.id]); if(c) return c;
  let {x,y}=worldMerc(d.lng,d.lat,WORLD);
  const cn=svg.querySelector('path[id="CN"]');
  try{ if(cn && !cn.isPointInFill(new DOMPoint(x,y))){
    outer: for(let r=2;r<=120;r+=3) for(let a=0;a<360;a+=15){
      const nx=x+r*Math.cos(a*Math.PI/180),ny=y+r*Math.sin(a*Math.PI/180);
      if(cn.isPointInFill(new DOMPoint(nx,ny))){ x=nx; y=ny; break outer; }
    }
  }}catch(e){}
  return {x,y};
}
// 世界图上把「中国境内」的钉拉回 CN 陆地。pixelSpread 散开后，沿海密集簇(如澳门/顺德)可能被推进海里，需要再贴回。
// 海外钉(WORLD_REGION 里有国家归属)不参与，避免被错误吸到中国。
function worldSnapCN(list){
  const cn=svg.querySelector('path[id="CN"]'); if(!cn) return;
  const inCN=(x,y)=>{ try{ return cn.isPointInFill(new DOMPoint(x,y)); }catch(e){ return false; } };
  for(const o of list){
    if(o.d.scope!=='china' || WORLD_REGION[o.d.id]) continue;
    if(inCN(o.x,o.y)) continue;
    outer: for(let r=2;r<=60;r+=2) for(let a=0;a<360;a+=15){
      const nx=o.x+r*Math.cos(a*Math.PI/180), ny=o.y+r*Math.sin(a*Math.PI/180);
      if(inCN(nx,ny)){ o.x=nx; o.y=ny; break outer; }
    }
  }
}
const THEME_PALETTE=['#D97757','#C9822F','#7C9A6B','#9A6BA8','#3F8B8B','#B3543C','#5E7CA8','#B58A2E'];
function arcD(A,B){
  const dx=B.x-A.x, dy=B.y-A.y, len=Math.hypot(dx,dy)||1;
  const off=Math.min(140, Math.max(30, len*0.22)), mx=(A.x+B.x)/2, my=(A.y+B.y)/2, nx=-dy/len, ny=dx/len;
  return `M${A.x},${A.y} Q${mx+nx*off},${my+ny*off} ${B.x},${B.y}`;
}
export async function renderConnections(season,episode){
  _rerender=()=>renderConnections(season,episode);
  await setBase(WORLD); back.hidden=true; curBase='world'; chinaZoom=null; hideOverlayLabel();
  const data=await loadEpData(season,episode);
  const links=data.links||[];
  const dishes=store.all.filter(d=>d.season===season && d.episode===episode && (showMinor || !d.minor));
  const base=dishes.map(d=>({d,...worldPixel(d)}));
  const truePos={}; base.forEach(o=>truePos[o.d.id]={x:o.x,y:o.y});
  const spread=pixelSpread(base, 26);
  // 世界图尺度下 pixelSpread 会把近重合的沿海簇(澳门3道+顺德)甩出十几像素(数纬度)，限制每个钉离真实地理位置不超过 CAP。
  const CAP=9;
  spread.forEach(o=>{ const t=truePos[o.d.id]; const dx=o.x-t.x, dy=o.y-t.y, dd=Math.hypot(dx,dy);
    if(dd>CAP){ o.x=t.x+dx/dd*CAP; o.y=t.y+dy/dd*CAP; } });
  worldSnapCN(spread);   // 收紧后再把可能落海的中国钉贴回陆地
  const posById={}; spread.forEach(o=>posById[o.d.id]=o);
  const tc={}; let ti=0;
  for(const lk of links) if(!(lk.theme in tc)) tc[lk.theme]=THEME_PALETTE[ti++ % THEME_PALETTE.length];
  const L=document.getElementById('conn-label');
  const setHL=(theme)=>{
    arcs.querySelectorAll('.arc').forEach(a=>{ a.classList.toggle('hl', a.dataset.theme===theme); a.classList.toggle('dim', !!theme && a.dataset.theme!==theme); });
    if(L){ if(theme){ L.textContent=theme; L.style.background=tc[theme]; L.hidden=false; } else L.hidden=true; }
  };
  const arcs=el('g',{class:'arc-layer'}); svg.appendChild(arcs);
  const dishById = id => store.all.find(x=>x.id===id);
  links.forEach(lk=>{ const A=posById[lk.a], B=posById[lk.b]; if(!A||!B) return;
    const d=arcD(A,B);
    const hit=el('path',{class:'arc-hit', d}); arcs.appendChild(hit);
    const arc=el('path',{class:'arc', d, 'data-theme':lk.theme, stroke:tc[lk.theme]}); arcs.appendChild(arc);
    hit.addEventListener('mouseenter',()=>setHL(lk.theme));
    hit.addEventListener('mouseleave',()=>setHL(null));
    hit.addEventListener('click',()=>{ setHL(lk.theme);
      const group=links.filter(x=>x.theme===lk.theme);                 // 同主题的全部连接 = 一个风味组
      const ids=[]; group.forEach(g=>[g.a,g.b].forEach(id=>{ if(!ids.includes(id)) ids.push(id); }));
      onConn({theme:lk.theme, color:tc[lk.theme], dishes:ids.map(dishById).filter(Boolean), links:group, groupDesc:(data.groupDesc||{})[lk.theme]});
    });
  });
  spread.forEach(o=>pinAt(o.d,o.x,o.y));   // 节点在弧线之上
}

/* ---------- 平移 / 缩放(操作 viewBox，钉与底图一起变换) ---------- */
let vb={x:0,y:0,w:0,h:0}, baseW=0, baseH=0;
// 图钉随缩放自适应：放大(viewBox 变小)时反向缩小图钉，使其屏幕尺寸大体恒定、不再越放越大。
function applyVB(){
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const k = baseW ? Math.max(.42, Math.min(1, vb.w/baseW)) : 1;
  svg.style.setProperty('--pscale', k.toFixed(3));
}
function resetView(cfg){ baseW=cfg.width; baseH=cfg.height; vb={x:0,y:0,w:cfg.width,h:cfg.height}; applyVB(); }
// viewBox 平滑补间(省份钻取/退出的缩放动画)。
function animateVB(target, dur=400){
  return new Promise(res=>{
    const s={...vb}, t0=performance.now(), ease=x=>1-Math.pow(1-x,3);
    (function step(now){
      const k=Math.min(1,(now-t0)/dur), e=ease(k);
      vb={ x:s.x+(target.x-s.x)*e, y:s.y+(target.y-s.y)*e, w:s.w+(target.w-s.w)*e, h:s.h+(target.h-s.h)*e };
      applyVB();
      if(k<1) requestAnimationFrame(step); else res();
    })(performance.now());
  });
}
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

// 三级返回：省份放大态 → 中国全图；中国全图 → 世界图。
back.addEventListener('click',()=>{ if(chinaZoom) exitProvince(); else animateSwap(renderWorld,'out'); });
let _ready=false; const _readyCbs=[];
export function onReady(cb){ if(_ready) cb(); else _readyCbs.push(cb); }
loadData().then(async s=>{
  store=s;
  await renderWorld();                                  // 等首帧底图+图钉就位再撤加载浮层
  document.getElementById('maploading')?.setAttribute('hidden','');
  _ready=true; _readyCbs.forEach(f=>f());
});
