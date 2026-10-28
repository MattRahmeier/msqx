// Coleta os gêneros que fontes abertas atribuem a cada álbum, para a curadoria dos gêneros do
// TrackMap (classificar-albuns.js decide o que entra). Só dados (nomes de gênero), nunca texto:
//   wikidata    — propriedade "gênero" (P136) do item do álbum; o item vem do artigo da Wikipédia da
//                 ficha ou da ligação do release-group no MusicBrainz (CC0)
//   musicbrainz — gêneros votados no release-group, com o número de votos (CC0)
// Resultado em fontes/generos-albuns.json (cache; fontes/ fica fora do git). Rodadas seguintes só
// buscam as fichas que faltam.
// Uso: node scripts/buscar-generos-albuns.js [--todos] [--sem-mb] [--ids id1,id2]   (--sem-mb: só Wikipédia/Wikidata, sem
// ocupar o MusicBrainz quando outro script está usando)

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const ARQ = path.join(RAIZ, "data", "albuns", "albuns.json");
const CACHE = path.join(RAIZ, "fontes", "generos-albuns.json");
const UA = { "User-Agent": "Tracklore/0.1 (https://github.com/MattRahmeier/tracklore)", Accept: "application/json" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const todos = process.argv.includes("--todos");
const semMb = process.argv.includes("--sem-mb");
const ids = process.argv.includes("--ids") ? new Set(process.argv[process.argv.indexOf("--ids") + 1].split(",")) : null; // só essas fichas

const ultimo = {};
async function pedir(servico, url, intervalo) {
  const espere = intervalo - (Date.now() - (ultimo[servico] || 0));
  if (espere > 0) await espera(espere);
  ultimo[servico] = Date.now();
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (r.ok) return r.json();
      if (r.status === 404) return null;
    } catch { /* tenta de novo */ }
    await espera(5000 * (t + 1));
  }
  return undefined; // falhou: a ficha entra na próxima rodada
}

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
const gravar = () => fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1) + "\n");

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8")).filter((f) => (todos || !cache[f.id]?.completo) && (!ids || ids.has(f.id)));
  console.log(`${fichas.length} fichas para buscar`);

  // 1. Item do Wikidata pelo artigo da Wikipédia (50 títulos por pedido, por idioma).
  const porIdioma = {};
  for (const f of fichas) {
    const m = f.sobreFonte?.url?.match(/^https:\/\/(\w+)\.wikipedia\.org\/wiki\/(.+)$/);
    if (m) (porIdioma[m[1]] ??= []).push([f, decodeURIComponent(m[2]).replace(/_/g, " ")]);
  }
  const item = {};
  for (const [lang, lista] of Object.entries(porIdioma)) {
    for (let i = 0; i < lista.length; i += 50) {
      const lote = lista.slice(i, i + 50);
      const q = new URLSearchParams({ action: "query", format: "json", formatversion: "2", redirects: "1", prop: "pageprops", ppprop: "wikibase_item", titles: lote.map(([, t]) => t).join("|") });
      const r = await pedir("wiki", `https://${lang}.wikipedia.org/w/api.php?${q}`, 300);
      const destino = (t) => { let x = t; for (const n of r?.query?.normalized || []) if (n.from === x) x = n.to; for (const n of r?.query?.redirects || []) if (n.from === x) x = n.to; return x; };
      for (const [f, t] of lote) {
        const p = (r?.query?.pages || []).find((pg) => pg.title === destino(t));
        if (p?.pageprops?.wikibase_item) item[f.id] = p.pageprops.wikibase_item;
      }
    }
  }

  console.log(`Wikipédia: ${Object.keys(item).length} itens do Wikidata`);

  // 2. MusicBrainz: gêneros votados e, sem artigo, a ligação com o Wikidata.
  let n = 0;
  for (const f of fichas) {
    const c = (cache[f.id] = { ...cache[f.id], wikidata: item[f.id] || cache[f.id]?.wikidata || null });
    if (!semMb && f.musicbrainz?.releaseGroup && !c.musicbrainz) {
      const rg = await pedir("mb", `https://musicbrainz.org/ws/2/release-group/${f.musicbrainz.releaseGroup}?fmt=json&inc=genres+url-rels`, 1100);
      if (rg === undefined) { console.log(`? ${f.id}: o MusicBrainz não respondeu`); continue; }
      c.musicbrainz = (rg?.genres || []).map((g) => ({ nome: g.name, votos: g.count }));
      c.wikidata ||= (rg?.relations || []).find((r) => r.type === "wikidata")?.url?.resource?.match(/Q\d+$/)?.[0] || null;
    }
    if (++n % 25 === 0) { gravar(); console.log(`${n}/${fichas.length}`); }
  }

  // 3. Wikidata: P136 de cada item e o nome em inglês de cada gênero (50 itens por pedido).
  const comItem = fichas.filter((f) => cache[f.id].wikidata);
  const alvos = [...new Set(comItem.map((f) => cache[f.id].wikidata))];
  const p136 = {};
  for (let i = 0; i < alvos.length; i += 50) {
    const r = await pedir("wd", `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${alvos.slice(i, i + 50).join("|")}`, 300);
    for (const [q, e] of Object.entries(r?.entities || {})) p136[q] = (e.claims?.P136 || []).map((cl) => cl.mainsnak?.datavalue?.value?.id).filter(Boolean);
  }
  const generosQ = [...new Set(Object.values(p136).flat())];
  const nomes = {};
  for (let i = 0; i < generosQ.length; i += 50) {
    const r = await pedir("wd", `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels&languages=en&ids=${generosQ.slice(i, i + 50).join("|")}`, 300);
    for (const [q, e] of Object.entries(r?.entities || {})) nomes[q] = e.labels?.en?.value || q;
  }
  for (const f of fichas) {
    const c = cache[f.id];
    if (c.wikidata && p136[c.wikidata]) c.wikidataGeneros = p136[c.wikidata].map((q) => nomes[q] || q);
    c.completo = (!f.musicbrainz?.releaseGroup || !!c.musicbrainz) && (!c.wikidata || !!c.wikidataGeneros);
  }
  gravar();
  const ok = Object.values(cache);
  console.log(`\npronto: ${ok.length} fichas · com gêneros no Wikidata ${ok.filter((c) => c.wikidataGeneros?.length).length} · no MusicBrainz ${ok.filter((c) => c.musicbrainz?.length).length}`);
})();
