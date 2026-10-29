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

// Ids de álbum de cada gênero (Map gênero → ids), na ordem dos charts. Usado pelo Guia de Gêneros e pelo TrackMap.
export async function albunsPorGenero() {
  const mapa = new Map();
  const junta = (g, id) => { const ids = mapa.get(g) || mapa.set(g, []).get(g); if (!ids.includes(id)) ids.push(id); };
  // Charts com listas por gênero dão "generos" em cada álbum; os demais valem para o chart inteiro.
  for (const c of await chartsTranscritos()) for (const a of c.albuns) if (a.album) for (const g of a.generos || c.generos) junta(g, a.album);
  // Depois dos charts, os estilos que o Wikidata e o MusicBrainz atribuem ao álbum (classificar-albuns.js).
  for (const f of (await albuns()).lista) for (const g of f.estilos || []) junta(g, f.id);
  return mapa;
}

export async function albuns() {
  const lista = await carregar("data/albuns/albuns.json");
  return { lista, porId: new Map(lista.map((a) => [a.id, a])) };
}

// Discos citados em A Curadoria: Map id da ficha → [{ id, titulo, numero }] das edições já publicadas
// em que o disco aparece (como álbum de uma faixa ou em "citados"). Usado pela marca laranja dos cards
// e pela seção "Citado no editorial" da ficha.
let citacoes;
export function citacoesEditoriais() {
  citacoes ??= curadorias().then((edicoes) => {
    const mapa = new Map();
    const hoje = new Date().toISOString().slice(0, 10);
    for (const e of edicoes.filter((x) => x.publicacao <= hoje)) {
      const ids = new Set([...(e.faixas || []).map((t) => t.album), ...(e.citados || []).map((c) => c.album)].filter(Boolean));
      for (const id of ids) (mapa.get(id) || mapa.set(id, []).get(id)).push({ id: e.id, titulo: e.titulo, numero: e.numero });
    }
    return mapa;
  });
  return citacoes;
}

export async function curadorias() {
  const ids = await carregar("data/curadorias/indice.json");
  return Promise.all(ids.map((id) => carregar(`data/curadorias/${id}.json`)));
}
