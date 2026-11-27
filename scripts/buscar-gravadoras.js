// Preenche "gravadora" nas fichas que já existem (data/albuns/albuns.json): a gravadora que mais
// aparece nas edições oficiais do release-group no MusicBrainz. Fichas novas já saem com
// o campo por scripts/criar-fichas.js.
// Uso: node scripts/buscar-gravadoras.js [--todos]   (sem --todos, só fichas sem "gravadora")

const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "data", "albuns", "albuns.json");
const UA = { "User-Agent": "MsqX/0.1 (https://github.com/MattRahmeier/msqx)", Accept: "application/json" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const todos = process.argv.includes("--todos");

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

// Mesma regra de scripts/criar-fichas.js.
// Gravadora principal: entre as gravadoras das edições oficiais do primeiro ano de lançamento, a que
// mais aparece no total das edições oficiais (sem "[no label]"). Assim fica o selo original
// (ex.: Blue Note, não um selo de reedição) e não a distribuidora de uma prensagem regional.
function gravadoraDe(versoes) {
  const oficiais = versoes.filter((v) => v.status === "Official");
  const nomes = (v) => [...new Set((v["label-info"] || []).map((l) => l.label?.name).filter((n) => n && !/^\[no label\]$/i.test(n)))];
  const total = new Map();
  for (const v of oficiais) for (const n of nomes(v)) total.set(n, (total.get(n) || 0) + 1);
  const anos = oficiais.map((v) => v.date?.slice(0, 4)).filter(Boolean).sort();
  const primeiras = anos.length ? oficiais.filter((v) => v.date?.startsWith(anos[0])) : oficiais;
  const candidatas = [...new Set(primeiras.flatMap(nomes))];
  return candidatas.sort((a, b) => total.get(b) - total.get(a))[0] || null;
}

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const salvar = () => fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  let feitos = 0;
  for (const f of fichas) {
    if (!f.musicbrainz?.releaseGroup || (!todos && "gravadora" in f)) continue;
    const r = await mb(`release?release-group=${f.musicbrainz.releaseGroup}&fmt=json&inc=labels&limit=100`);
    // Mantém a ordem dos campos: gravadora logo depois de "tipo".
    const g = gravadoraDe(r?.releases || []);
    const o = {};
    for (const [k, v] of Object.entries(f)) { if (k === "gravadora") continue; o[k] = v; if (k === "tipo") o.gravadora = g; }
    if (!("gravadora" in o)) o.gravadora = g;
    Object.keys(f).forEach((k) => delete f[k]);
    Object.assign(f, o);
    feitos++;
    console.log(`${g ? "✓" : "–"} ${f.id}${g ? `: ${g}` : ""}`);
    if (feitos % 20 === 0) salvar();
  }
  salvar();
  console.log(`\n${feitos} fichas · com gravadora: ${fichas.filter((f) => f.gravadora).length}`);
})();
