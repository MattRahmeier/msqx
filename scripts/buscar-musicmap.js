// Ligações de influência entre gêneros segundo o Musicmap (https://musicmap.info).
// Lê o mapa do site (o SVG tem um nó por gênero, com código como "met06", e uma linha por influência,
// com a classe "met06 hcp02"), e grava em data/generos/generos.json:
//   musicmap     — código do gênero equivalente no Musicmap (de data/generos/musicmap-mapa.json, feito à mão;
//                  códigos de três letras são supergêneros, usados pelos mestres)
//   influencias  — gêneros nossos ligados por uma linha do Musicmap que ainda não estão em pai/origens/similares
// Vários gêneros nossos podem cair no mesmo nó do Musicmap (ex.: Stoner e Sludge Metal); só o primeiro do
// mapa recebe as linhas do nó, para não multiplicar ligações que o Musicmap não desenha.
// Só as ligações (fatos) são usadas; nenhum texto do Musicmap é copiado.
// Uso: node scripts/buscar-musicmap.js [--mostrar]

const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "data", "generos", "generos.json");
const MAPA = require(path.join(__dirname, "..", "data", "generos", "musicmap-mapa.json"));

(async () => {
  const html = await (await fetch("https://musicmap.info/", { headers: { "User-Agent": "Mozilla/5.0 (MsqX; https://github.com/MattRahmeier/msqx)" } })).text();
  const vizinhos = new Map();
  const ligar = (a, b) => (vizinhos.get(a) ?? vizinhos.set(a, new Set()).get(a)).add(b);
  for (const m of html.matchAll(/class="([a-z]{3}\d{2}(?: [a-z]{3}\d{2})+)"/g)) {
    const [a, ...outros] = m[1].split(" ");
    for (const b of outros) { ligar(a, b); ligar(b, a); }
  }
  if (!vizinhos.size) throw new Error("nenhuma ligação encontrada — o formato do Musicmap mudou?");

  const principal = new Map(); // código → primeiro gênero nosso que usa o código
  for (const [id, codigo] of Object.entries(MAPA)) if (!principal.has(codigo)) principal.set(codigo, id);

  const generos = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const porId = new Map(generos.map((g) => [g.id, g]));
  const jaLigados = (a, b) => a.pai === b.id || b.pai === a.id || a.origens?.includes(b.id) || b.origens?.includes(a.id)
    || a.similares?.includes(b.id) || b.similares?.includes(a.id);
  let total = 0;
  for (const g of generos) {
    if (MAPA[g.id]) g.musicmap = MAPA[g.id]; else delete g.musicmap;
    delete g.influencias;
    if (principal.get(MAPA[g.id]) !== g.id) continue;
    const lista = [...(vizinhos.get(MAPA[g.id]) || [])].map((c) => porId.get(principal.get(c))).filter((o) => o && o.id !== g.id && !jaLigados(g, o)).map((o) => o.id);
    if (lista.length) { g.influencias = lista; total += lista.length; }
    if (process.argv.includes("--mostrar") && lista.length) console.log(`${g.id}: ${lista.join(", ")}`);
  }
  fs.writeFileSync(ARQ, JSON.stringify(generos, null, 2) + "\n");
  console.log(`${vizinhos.size} nós com ligação no Musicmap · ${Object.keys(MAPA).length} gêneros mapeados · ${total} influências novas (contadas dos dois lados)`);
})();
