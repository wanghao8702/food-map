const panel = document.getElementById('panel');
let onFulltext = ()=>{};
export function bindFulltext(cb){ onFulltext = cb; }
export function openPanel(d){
  panel.hidden=false;
  panel.innerHTML = `
    <button class="close" aria-label="关闭">×</button>
    <img class="art" src="./assets/svg/${d.svg}" alt="${d.name}">
    <h2>${d.name}</h2>
    <p class="meta">📍${d.region}　|　🎬 风味人间${d.season} · 第${d.episode}集《${d.episodeTitle}》</p>
    <h3>美食介绍</h3><p>${d.intro}</p>
    <h3>纪录片文案</h3><blockquote>${d.quote}</blockquote>
    <button class="ft">查看本集全文</button>`;
  panel.querySelector('.close').onclick=()=>panel.hidden=true;
  panel.querySelector('.ft').onclick=()=>onFulltext(d);
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape') panel.hidden=true; });
