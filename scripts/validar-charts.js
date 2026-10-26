// Valida os charts transcritos em data/charts/mu/*.json e lista o que precisa ser conferido.
// Uso: node scripts/validar-charts.js

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const PASTA = path.join(RAIZ, "data", "charts", "mu");
const indice = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "charts", "mu-essential-charts.json"), "utf8")).map((c) => [c.id, c]));
const generos = new Set(JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "generos", "generos.json"), "utf8")).map((g) => g.id));

const erros = [];
const conferir = [];
let total = 0;

for (const arquivo of fs.readdirSync(PASTA).filter((f) => f.endsWith(".json")).sort()) {
  const c = JSON.parse(fs.readFileSync(path.join(PASTA, arquivo), "utf8"));
  const nome = arquivo.replace(/\.json$/, "");
  if (c.id !== nome) erros.push(`${arquivo}: "id" deve ser "${nome}"`);
  if (!indice.has(c.indice)) erros.push(`${c.id}: "indice" "${c.indice}" não está em mu-essential-charts.json`);
  for (const g of c.generos || []) if (!generos.has(g)) erros.push(`${c.id}: gênero "${g}" não existe`);
  if (!c.albuns?.length) erros.push(`${c.id}: sem álbuns`);

  const posicoes = new Set();
  for (const a of c.albuns || []) {
    if (posicoes.has(a.pos)) erros.push(`${c.id}: posição "${a.pos}" repetida`);
    posicoes.add(a.pos);
    if (!a.artista) erros.push(`${c.id} ${a.pos}: falta "artista"`);
    if (!a.titulo && !a.conferir) erros.push(`${c.id} ${a.pos}: sem "titulo" e sem "conferir"`);
    if (a.conferir) conferir.push(`${c.id} ${a.pos}: ${a.artista} — ${a.titulo ?? "?"} (${a.conferir})`);
  }
  total += c.albuns?.length || 0;
  console.log(`${c.id.padEnd(14)} ${String(c.albuns?.length || 0).padStart(3)} álbuns · ${c.transcricao?.status}`);
}

console.log(`\n${total} álbuns no total.`);
if (conferir.length) console.log(`\nConferir (${conferir.length}):\n  ` + conferir.join("\n  "));
for (const e of erros) console.log("ERRO:", e);
console.log(erros.length ? `\n${erros.length} erro(s).` : "\nOK.");
process.exit(erros.length ? 1 : 0);
