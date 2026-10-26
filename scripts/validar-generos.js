// Valida data/generos/generos.json.
// Uso: node scripts/validar-generos.js [--wiki]
//   --wiki  também confere se os links da Wikipédia em "fontes" existem.

const fs = require("fs");
const path = require("path");

const arquivo = path.join(__dirname, "..", "data", "generos", "generos.json");
const generos = JSON.parse(fs.readFileSync(arquivo, "utf8"));
const porId = new Map();
const erros = [];
const avisos = [];

for (const g of generos) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.id)) erros.push(`${g.id}: id fora de kebab-case`);
  if (porId.has(g.id)) erros.push(`${g.id}: id duplicado`);
  porId.set(g.id, g);
  for (const campo of ["nome", "resumo"]) if (!g[campo]) erros.push(`${g.id}: falta "${campo}"`);
  if (g.mestre !== (g.pai === null)) erros.push(`${g.id}: "mestre" deve ser true só quando "pai" é null`);
}

for (const g of generos) {
  if (g.pai !== null && !porId.has(g.pai)) erros.push(`${g.id}: pai "${g.pai}" não existe`);
  for (const s of g.similares || []) {
    if (!porId.has(s)) erros.push(`${g.id}: similar "${s}" não existe`);
    if (s === g.id) erros.push(`${g.id}: similar a si mesmo`);
  }
  // Origens fora do piloto são permitidas (o site ignora); só avisamos.
  for (const o of g.origens || []) if (!porId.has(o)) avisos.push(`${g.id}: origem "${o}" ainda não cadastrada`);

  // Ciclos na hierarquia
  const vistos = new Set([g.id]);
  for (let p = g.pai; p; p = porId.get(p)?.pai) {
    if (vistos.has(p)) { erros.push(`${g.id}: ciclo na hierarquia`); break; }
    vistos.add(p);
  }
}

const mestres = generos.filter((g) => g.mestre);
console.log(`${generos.length} gêneros, ${mestres.length} mestres:`);
for (const m of mestres) {
  const total = generos.filter((g) => raiz(g) === m.id).length - 1;
  console.log(`  ${m.nome.padEnd(12)} ${total} subgêneros`);
}

function raiz(g) {
  while (g.pai) g = porId.get(g.pai);
  return g.id;
}

async function conferirWiki() {
  const urls = [...new Set(generos.flatMap((g) => g.fontes || []))].filter((u) => u.includes("wikipedia.org/wiki/"));
  const titulos = urls.map((u) => decodeURIComponent(u.split("/wiki/")[1]).replace(/_/g, " "));
  // A API aceita até 50 títulos por chamada; uma chamada por lote evita o limite de requisições.
  for (let i = 0; i < titulos.length; i += 50) {
    const lote = titulos.slice(i, i + 50);
    const api = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=${encodeURIComponent(lote.join("|"))}`;
    const resp = await fetch(api, { headers: { "User-Agent": "MusiqueScout-validador/0.1" } });
    if (!resp.ok) { avisos.push(`Wikipédia respondeu ${resp.status}; links não conferidos — tente de novo mais tarde`); return; }
    const r = await resp.json();
    for (const p of Object.values(r.query.pages)) if (p.missing !== undefined) erros.push(`link quebrado: ${p.title}`);
    for (const red of r.query.redirects || []) avisos.push(`redireciona: ${red.from} → ${red.to}`);
  }
}

(async () => {
  if (process.argv.includes("--wiki")) await conferirWiki();
  const origensFora = [...new Set(avisos.filter((a) => a.includes("origem")).map((a) => a.match(/"(.+)"/)[1]))];
  if (origensFora.length) console.log(`\nOrigens fora do piloto (${origensFora.length}): ${origensFora.join(", ")}`);
  for (const a of avisos.filter((a) => !a.includes("origem"))) console.log("aviso:", a);
  for (const e of erros) console.log("ERRO:", e);
  console.log(erros.length ? `\n${erros.length} erro(s).` : "\nOK.");
  process.exit(erros.length ? 1 : 0);
})();
