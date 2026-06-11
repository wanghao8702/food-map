// id→菜名查表，loadData 时填充，供 fulltext.js 等按 id 取名(替代旧的 window.__dishNames 全局)。
let _names = {};
export function dishName(id){ return _names[id] || ''; }

export async function loadData() {
  const dishes = await (await fetch('./dishes.json')).json();
  _names = Object.fromEntries(dishes.map(d=>[d.id,d.name]));
  return {
    all: dishes,
    world: dishes.filter(d => d.scope === 'world'),
    china: dishes.filter(d => d.scope === 'china'),
  };
}
