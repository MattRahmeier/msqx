// Preenche "discogs" nas fichas (data/albuns/albuns.json): o link do registro mestre do álbum no
// Discogs (discogs.com/master/…), tirado das ligações do release-group no MusicBrainz. Sem
// registro mestre ligado, usa o de uma edição (discogs.com/release/…).
// Uso: node scripts/buscar-discogs.js [--todos] [--ids id1,id2]   (sem --todos, só fichas sem "discogs")

const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "data", "albuns", "albuns.json");
const UA = { "User-Agent": "Tracklore/0.1 (https://github.com/MattRahmeier/tracklore)", Accept: "application/json" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const todos = process.argv.includes("--todos");
const ids = process.argv.includes("--ids") ? new Set(process.argv[process.argv.indexOf("--ids") + 1].split(",")) : null; // só essas fichas

async function mb(caminho) {
  await espera(1100);
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(`https://musicbrainz.org/ws/2/${caminho}`, { headers: UA });
      if (r.ok) return r.json();
      if (r.status === 404) return null;
    } catch { /* tenta de novo */ }
    await espera(5000 * (t + 1));
  }
  return null;
}

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  let feitos = 0;
  for (const f of fichas) {
    if (ids && !ids.has(f.id)) continue;
    if (!f.musicbrainz?.releaseGroup || (!todos && "discogs" in f)) continue;
    const rg = await mb(`release-group/${f.musicbrainz.releaseGroup}?fmt=json&inc=url-rels`);
    // Consulta que falhou não vira "sem Discogs": a ficha fica sem o campo e entra na próxima rodada.
    if (!rg) { console.log(`? ${f.id}: o MusicBrainz não respondeu`); continue; }
    const urls = (rg?.relations || []).filter((r) => r.type === "discogs").map((r) => r.url?.resource).filter(Boolean);
    let url = urls.find((u) => /\/master\//.test(u)) || urls[0] || null;
    if (!url && f.musicbrainz.release) {
      const rel = await mb(`release/${f.musicbrainz.release}?fmt=json&inc=url-rels`);
      url = (rel?.relations || []).find((r) => r.type === "discogs")?.url?.resource || null;
    }
    f.discogs = url;
    feitos++;
    console.log(`${url ? "✓" : "–"} ${f.id}${url ? `: ${url}` : ""}`);
    if (feitos % 25 === 0) fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  }
  fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  console.log(`\n${feitos} fichas · com Discogs: ${fichas.filter((f) => f.discogs).length}`);
})();
