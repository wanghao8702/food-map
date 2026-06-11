import { dishName } from './data.js';
const layer = document.getElementById('fulltext');
const epCache = {};
async function loadEp(season,ep){
  const key=`fw${season}-${String(ep).padStart(2,'0')}`;
  if(!epCache[key]) epCache[key]=await (await fetch(`./episodes/${key}.json`)).json();
  return epCache[key];
}
export async function openFulltext(dish){
  const data = await loadEp(dish.season, dish.episode);
  const body = data.paragraphs.map(p=>{
    if(p.marker) return `<p class="loc">${p.text}</p>`;
    if(p.anchor) return `<p class="seg" id="${p.anchor}" data-dish="${p.dishId}">`+
      `<span class="tag">${dishName(p.dishId)}</span>${p.text}</p>`;
    return `<p>${p.text}</p>`;
  }).join('');
  const nav = data.paragraphs.filter(p=>p.anchor)
    .map(p=>`<button data-go="${p.anchor}">${dishName(p.dishId)}</button>`).join('');
  layer.innerHTML = `<div class="ft-box">
    <header><h2>风味人间${data.season} · 第${data.episode}集《${data.title}》</h2>
    <button class="ft-close">×</button></header>
    <nav class="ft-nav">${nav}</nav><article>${body}</article></div>`;
  layer.hidden=false;
  layer.querySelector('.ft-close').onclick=()=>layer.hidden=true;
  layer.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>focusSeg(b.dataset.go));
  requestAnimationFrame(()=>focusSeg(dish.episodeAnchor));
}
function focusSeg(anchor){
  const seg=document.getElementById(anchor); if(!seg) return;
  layer.querySelectorAll('.seg.active').forEach(s=>s.classList.remove('active'));
  seg.classList.add('active'); seg.scrollIntoView({behavior:'smooth',block:'center'});
}
