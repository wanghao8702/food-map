const panel = document.getElementById('panel');
let onFulltext = ()=>{};
export function bindFulltext(cb){ onFulltext = cb; }

// 详情卡片改为锚定在被点击图钉旁的浮动气泡，贴边时自动翻转、出界时夹回视口内
function placePanel(anchorEl){
  if(!anchorEl){ panel.style.left='auto'; panel.style.right='16px'; panel.style.top='70px'; panel.removeAttribute('data-side'); return; }
  const r = anchorEl.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const pw = panel.offsetWidth, ph = panel.offsetHeight, gap = 14;
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  let side='right', left = r.right + gap, top = cy - ph/2;
  if(left + pw > vw - 8){ side='left'; left = r.left - gap - pw; }
  if(left < 8){ side = (cy > vh/2) ? 'top' : 'bottom'; left = cx - pw/2; top = (side==='bottom') ? r.bottom + gap : r.top - gap - ph; }
  left = Math.max(8, Math.min(left, vw - pw - 8));
  top  = Math.max(8, Math.min(top,  vh - ph - 8));
  panel.style.left = left+'px'; panel.style.top = top+'px'; panel.style.right='auto';
  panel.dataset.side = side;
  panel.style.setProperty('--caret-y', Math.max(16, Math.min(cy-top, ph-16))+'px');
  panel.style.setProperty('--caret-x', Math.max(16, Math.min(cx-left, pw-16))+'px');
}

export function openPanel(d, anchorEl){
  panel.hidden=false;
  panel.innerHTML = `
    <button class="close" aria-label="关闭">×</button>
    <div class="pp-body">
      <img class="art" src="./assets/svg/${d.svg}" alt="${d.name}">
      <h2>${d.name}</h2>
      <p class="meta">📍${d.region}　|　🎬 风味人间${d.season} · 第${d.episode}集《${d.episodeTitle}》</p>
      <h3>美食介绍</h3><p>${d.intro}</p>
      <h3>纪录片文案</h3><blockquote>${d.quote}</blockquote>
      <button class="ft">查看本集全文</button>
    </div>`;
  panel.querySelector('.close').onclick=()=>panel.hidden=true;
  panel.querySelector('.ft').onclick=()=>onFulltext(d);
  placePanel(anchorEl);
}

// 拖动/缩放地图或在空白处按下时收起浮卡（图钉的 mousedown 会先冒泡到地图，但此时卡片尚未打开，无副作用）
const mapEl = document.getElementById('map');
['mousedown','wheel','touchstart'].forEach(ev=>
  mapEl.addEventListener(ev, ()=>{ if(!panel.hidden) panel.hidden=true; }, {passive:true}));

/* ---------- 风味连接弹窗：主题 + 手写连接说明 + 相连两道菜 ---------- */
const connmodal = document.getElementById('connmodal');
function dishCard(d){
  if(!d) return '';
  return `<div class="cm-dish">
      <img class="cm-art" src="./assets/svg/${d.svg}" alt="${d.name}">
      <div class="cm-name">${d.name}</div>
      <div class="cm-region">📍${d.region}</div>
      <p class="cm-intro">${d.intro}</p>
    </div>`;
}
// group = {theme, color, dishes:[d...], links:[{a,b,desc}...]}。一个主题可能串起 3 道以上美食，卡片里全部展示。
export function openConnModal(group){
  const {theme, color, dishes=[], links=[], groupDesc} = group || {};
  connmodal.hidden=false;
  const cards = dishes.map(dishCard);
  const row = (dishes.length===2)
    ? cards[0] + '<div class="cm-arrow">⇄</div>' + cards[1]
    : cards.join('');
  // 一整段文案：优先用 groupDesc；否则退回单条 desc（必要时把多段拼成一段）
  const para = groupDesc || (links.length===1 ? (links[0].desc||'') : links.map(l=>l.desc).filter(Boolean).join(''));
  const descHtml = para ? `<p class="cm-desc">${para}</p>` : '';
  connmodal.innerHTML = `
    <div class="cm-backdrop"></div>
    <div class="cm-card">
      <button class="cm-close" aria-label="关闭">×</button>
      <div class="cm-theme" ${color?`style="background:${color}"`:''}>${theme}${dishes.length>2?` · ${dishes.length} 道`:''}</div>
      <div class="cm-pair${dishes.length>2?' cm-multi':''}">${row}</div>
      ${descHtml}
    </div>`;
  const close = ()=>{ connmodal.hidden=true; };
  connmodal.querySelector('.cm-close').onclick = close;
  connmodal.querySelector('.cm-backdrop').onclick = close;
}

/* ---------- 季节简介卡片：常驻屏幕左上角，切季时更新、选「全部」或点×时收起 ---------- */
const seasoncard = document.getElementById('seasoncard');
const SEASON_TINT = {1:'#e8623f',2:'#d98a3d',3:'#5b8fb0',4:'#7fa860'};
let _seasons = null;
async function getSeasons(){
  if(_seasons) return _seasons;
  try{ _seasons = await (await fetch('./seasons.json')).json(); }
  catch(e){ _seasons = []; }
  return _seasons;
}
export function closeSeasonCard(){ seasoncard.hidden = true; }
export async function openSeasonCard(season){
  if(season==null){ seasoncard.hidden = true; return; }
  const list = await getSeasons();
  const s = list.find(x=>x.season===season);
  if(!s){ seasoncard.hidden = true; return; }
  const tint = SEASON_TINT[season] || '#cc785c';
  const rating = s.rating
    ? `<div class="sc-rating"><span class="sc-score">${s.rating}</span><span class="sc-score-tag">豆瓣</span></div>`
    : `<div class="sc-rating"><span class="sc-score-na">评分待补充</span></div>`;
  const epText = s.episodesNote || `共 ${s.episodes} 集`;
  const meta = [s.year, s.director?`导演 ${s.director}`:'', epText].filter(Boolean).join(' · ');
  seasoncard.hidden=false;
  seasoncard.innerHTML = `
    <button class="sc-close" aria-label="收起">×</button>
    <div class="sc-cover-wrap" style="--tint:${tint}">
      <span class="sc-cover-fallback">${s.title}</span>
      <img class="sc-cover" src="./${s.cover}" alt="" onerror="this.style.display='none'">
    </div>
    <div class="sc-info">
      <h2 class="sc-title">${s.title}</h2>
      <div class="sc-meta">${meta}</div>
      ${rating}
      <p class="sc-summary">${s.summary || '简介待补充。'}</p>
      ${s.douban?`<a class="sc-link" href="${s.douban}" target="_blank" rel="noopener">豆瓣 →</a>`:''}
    </div>`;
  seasoncard.querySelector('.sc-close').onclick = ()=>{ seasoncard.hidden=true; };
}

document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ panel.hidden=true; connmodal.hidden=true; } });
