// Valida data/albuns/albuns.json contra os charts e lista as fichas a conferir.
// Uso: node scripts/validar-albuns.js

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const fichas = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "albuns", "albuns.json"), "utf8"));
const porId = new Map(fichas.map((f) => [f.id, f]));
const erros = [];
const conferir = [];

for (const f of fichas) {
  // Todas as fichas precisam das mesmas informações (scripts/completar-fichas.js preenche o que faltar).
  for (const campo of ["titulo", "artista", "lancamento", "duracao", "gravadora"]) if (!f[campo]) erros.push(`${f.id}: falta "${campo}"`);
  if (!f.faixas?.length) erros.push(`${f.id}: sem faixas`);
  else if (f.faixas.some((t) => !t.duracao)) erros.push(`${f.id}: faixa sem duração`);
  if (f.capa && !fs.existsSync(path.join(RAIZ, f.capa))) erros.push(`${f.id}: capa "${f.capa}" não existe`);
  if (f.conferir) conferir.push(`${f.id}: ${f.conferir}`);
}

const pasta = path.join(RAIZ, "data", "charts", "mu");
for (const arq of fs.readdirSync(pasta).filter((a) => a.endsWith(".json"))) {
  const c = JSON.parse(fs.readFileSync(path.join(pasta, arq), "utf8"));
  for (const a of c.albuns) {
    if (!a.titulo) continue;
    if (!a.album) erros.push(`${c.id} ${a.pos}: sem "album" (rode scripts/criar-fichas.js)`);
    else if (!porId.has(a.album)) erros.push(`${c.id} ${a.pos}: ficha "${a.album}" não existe`);
  }
}

const n = (fn) => fichas.filter(fn).length;
const plat = ["spotify", "youtubeMusic", "qobuz", "bandcamp", "appleMusic", "deezer", "tidal"];
console.log(`${fichas.length} fichas · com capa ${n((f) => f.capa)} · com faixas ${n((f) => f.faixas?.length)} · com data ${n((f) => f.lancamento)}`);
console.log("links diretos: " + plat.map((p) => `${p} ${n((f) => f.links?.[p])}`).join(", "));
console.log(`sem nenhum link: ${n((f) => !Object.keys(f.links || {}).length)} · links ainda não verificados: ${n((f) => !f.linksVerificados)} (rode scripts/verificar-links.js)`);
if (conferir.length) console.log(`\nConferir (${conferir.length}):\n  ` + conferir.join("\n  "));
for (const e of erros) console.log("ERRO:", e);
console.log(erros.length ? `\n${erros.length} erro(s).` : "\nOK.");
process.exit(erros.length ? 1 : 0);
