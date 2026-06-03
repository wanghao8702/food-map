export async function loadData() {
  const dishes = await (await fetch('./dishes.json')).json();
  window.__dishNames = Object.fromEntries(dishes.map(d=>[d.id,d.name]));
  return {
    all: dishes,
    world: dishes.filter(d => d.scope === 'world'),
    china: dishes.filter(d => d.scope === 'china'),
  };
}
