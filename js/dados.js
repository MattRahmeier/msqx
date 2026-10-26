// Carregamento dos JSON de data/. Cada arquivo é baixado uma vez e guardado em memória.

const cache = new Map();

async function carregar(caminho) {
  if (!cache.has(caminho)) {
    cache.set(caminho, fetch(caminho).then((r) => {
      if (!r.ok) throw new Error(`${caminho}: ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(caminho);
}

export async function generos() {
  const lista = await carregar("data/generos/generos.json");
  return { lista, porId: new Map(lista.map((g) => [g.id, g])) };
}

export const charts = () => carregar("data/charts/mu-essential-charts.json");

// Charts já transcritos (data/charts/mu/), na ordem de mu-transcritos.json.
export async function chartsTranscritos() {
  const ids = await carregar("data/charts/mu-transcritos.json");
  return Promise.all(ids.map((id) => carregar(`data/charts/mu/${id}.json`)));
}

export async function albuns() {
  const lista = await carregar("data/albuns/albuns.json");
  return { lista, porId: new Map(lista.map((a) => [a.id, a])) };
}

export async function curadorias() {
  const ids = await carregar("data/curadorias/indice.json");
  return Promise.all(ids.map((id) => carregar(`data/curadorias/${id}.json`)));
}
