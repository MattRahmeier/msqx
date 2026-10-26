// Grava em cada gênero "resumoLinks": os trechos do resumo que citam outro gênero.
// O texto do resumo não é alterado; o site usa as posições para criar os links.
// Uso: node scripts/ligar-resumos.js   (rode depois de buscar-resumos.js ou de editar um resumo)

const fs = require("fs");
const path = require("path");
const { calcularLinks } = require("./links-resumo");

const arquivo = path.join(__dirname, "..", "data", "generos", "generos.json");
const generos = JSON.parse(fs.readFileSync(arquivo, "utf8"));
const links = calcularLinks(generos);

let total = 0;
for (const g of generos) {
  const l = links.get(g.id) || [];
  total += l.length;
  // resumoLinks fica logo depois de resumoFonte (ou de resumo).
  const o = {};
  for (const k of Object.keys(g)) {
    if (k === "resumoLinks") continue;
    o[k] = g[k];
    if (k === (g.resumoFonte ? "resumoFonte" : "resumo") && l.length) o.resumoLinks = l;
  }
  Object.keys(g).forEach((k) => delete g[k]);
  Object.assign(g, o);
}

fs.writeFileSync(arquivo, JSON.stringify(generos, null, 2) + "\n");
console.log(`${total} links em ${[...links.values()].filter((l) => l.length).length} resumos.`);
if (process.argv.includes("--mostrar")) {
  for (const g of generos) {
    if (!g.resumoLinks) continue;
    let t = g.resumo;
    for (const l of [...g.resumoLinks].reverse()) t = t.slice(0, l.de) + `[${t.slice(l.de, l.ate)}→${l.genero}]` + t.slice(l.ate);
    console.log(`${g.id}: ${t}`);
  }
}
