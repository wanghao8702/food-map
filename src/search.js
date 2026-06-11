// 搜索 + 季筛选（二合一下拉面板）。匹配菜名/产地；点结果 → 地图飞到该菜并开详情面板。
// matchDishes 抽成纯函数，便于在 tests.html 单测。

export function matchDishes(dishes, query, season){
  const q = (query||'').trim().toLowerCase();
  const out = dishes.filter(d=>{
    if(season!=null && d.season!==season) return false;
    if(!q) return true;
    return (d.name||'').toLowerCase().includes(q) || (d.region||'').toLowerCase().includes(q);
  });
  if(q) out.sort((a,b)=>{                          // 菜名命中优先于产地命中
    const an=(a.name||'').toLowerCase().includes(q)?0:1;
    const bn=(b.name||'').toLowerCase().includes(q)?0:1;
    return an-bn;
  });
  return out;
}

const MAX_RESULTS = 60;

export function initSearch(dishes, focusDish){
  const box     = document.getElementById('searchbox');
  const panel   = document.getElementById('searchpanel');
  const chipbar = document.getElementById('searchchips');
  const list    = document.getElementById('searchresults');
  const empty   = document.getElementById('searchempty');
  if(!box || !panel) return;

  let season = null;
  const chips = [];
  const seasons = [...new Set(dishes.map(d=>d.season))].sort((a,b)=>a-b);
  const mkChip = (label, val)=>{
    const b = document.createElement('button'); b.textContent = label; b.className = 'season';
    b.addEventListener('click', ()=>{ season = val; chips.forEach(c=>c.classList.toggle('active', c===b)); render(); box.focus(); });
    chips.push(b); chipbar.appendChild(b); return b;
  };
  mkChip('全部', null).classList.add('active');
  seasons.forEach(s=> mkChip('S'+s, s));

  function render(){
    const results = matchDishes(dishes, box.value, season);
    list.innerHTML = '';
    results.slice(0, MAX_RESULTS).forEach(d=>{
      const li = document.createElement('li'); li.className = 'sr-item';
      li.innerHTML =
        `<img class="sr-art" src="./assets/svg/${d.svg}" alt="">` +
        `<div class="sr-text"><div class="sr-name">${d.name}</div>` +
        `<div class="sr-region">📍${d.region} · S${d.season}E${d.episode}</div></div>`;
      li.addEventListener('click', ()=>{ close(); focusDish(d.id); });
      list.appendChild(li);
    });
    empty.hidden = results.length !== 0;
  }

  // 下拉面板贴在搜索框正下方、右对齐。
  function place(){
    const r = box.getBoundingClientRect();
    panel.style.top = (r.bottom + 6) + 'px';
    panel.style.right = (window.innerWidth - r.right) + 'px';
  }
  function open(){ place(); panel.hidden = false; render(); }
  function close(){ panel.hidden = true; }

  box.addEventListener('focus', open);
  box.addEventListener('input', ()=>{ if(panel.hidden) open(); else render(); });
  window.addEventListener('resize', ()=>{ if(!panel.hidden) place(); });
  document.addEventListener('click', e=>{
    if(panel.hidden) return;
    if(box.contains(e.target) || panel.contains(e.target)) return;   // 点框内/面板内不关
    close();
  });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !panel.hidden){ close(); box.blur(); } });
}
