export async function loadData() {
  const dishes = await (await fetch('./dishes.json')).json();
  return {
    all: dishes,
    world: dishes.filter(d => d.scope === 'world'),
    china: dishes.filter(d => d.scope === 'china'),
  };
}
