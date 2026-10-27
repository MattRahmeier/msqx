// Grava nas fichas (data/albuns/albuns.json) as notas do Rate Your Music coletadas pelo Claude in
// Chrome, com a sessão do usuário e em ritmo humano (decisão da Fase 0; o RYM bloqueia acesso
// automatizado). Só a média dos usuários e o link — nenhum texto.
// Entrada: JSON [{ "id": "<ficha>", "url": "https://rateyourmusic.com/release/...", "media": 3.71, "votos": 87 }]
// Regras (iguais às das outras notas): só média >= 3,5 e no máximo duas notas por ficha.
// Uso: node scripts/aplicar-notas-rym.js notas-rym.json

const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "data", "albuns", "albuns.json");
const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
const notas = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const meio = (x) => Math.round(x * 2) / 2;

let gravadas = 0;
for (const n of notas) {
  const f = fichas.find((x) => x.id === n.id);
  if (!f || !n.url || !(n.media >= 3.5)) { console.log(`– ${n.id}: ${!f ? "ficha não existe" : n.media ? `média ${n.media} abaixo de 3,5` : "sem nota"}`); continue; }
  const r = { fonte: "Rate Your Music (usuários)", nota: `${n.media.toFixed(2)}/5`, estrelas: meio(n.media), url: n.url, votos: n.votos };
  f.reviews = [...(f.reviews || []).filter((x) => !/^Rate Your Music/.test(x.fonte)), r].sort((a, b) => b.estrelas - a.estrelas).slice(0, 2);
  gravadas++;
  console.log(`✓ ${n.id}: ${r.nota} (${n.votos} votos)`);
}
fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
console.log(`\n${gravadas} notas gravadas · fichas sem nenhuma nota: ${fichas.filter((f) => !f.reviews?.length).length}`);
