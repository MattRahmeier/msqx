// Troca textos em inglês por traduções em português e marca a fonte como traduzida.
// Uso: node scripts/aplicar-traducoes.js traducoes.json [mais.json ...]
//   Chaves do JSON: "resumo:<gênero>", "som:<gênero>" ou "sobre:<álbum>" (só "<álbum>" também vale
//   para "sobre"). O valor é o texto traduzido.
// O texto original não é guardado: fica só o link para ele na fonte (resumoFonte/somFonte/
// sobreFonte.url), com "traduzido": true e "idioma" continuando o do original ("en").
// Depois rode scripts/ligar-resumos.js para recalcular os links dos textos dos gêneros.
// Atenção: rodar de novo buscar-resumos/buscar-som/buscar-sobre-albuns para esses itens traz de
// volta o texto em inglês; aí é preciso traduzir de novo.

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const ARQ_GENEROS = path.join(RAIZ, "data", "generos", "generos.json");
const ARQ_ALBUNS = path.join(RAIZ, "data", "albuns", "albuns.json");
const generos = JSON.parse(fs.readFileSync(ARQ_GENEROS, "utf8"));
const albuns = JSON.parse(fs.readFileSync(ARQ_ALBUNS, "utf8"));
const gPorId = new Map(generos.map((g) => [g.id, g]));
const aPorId = new Map(albuns.map((a) => [a.id, a]));

const arquivos = process.argv.slice(2);
if (!arquivos.length) { console.log("Uso: node scripts/aplicar-traducoes.js traducoes.json"); process.exit(1); }

let aplicadas = 0;
const erros = [];
for (const arq of arquivos) {
  for (const [chave, texto] of Object.entries(JSON.parse(fs.readFileSync(arq, "utf8")))) {
    const [campo, id] = chave.includes(":") ? chave.split(/:(.*)/) : ["sobre", chave];
    const item = campo === "sobre" ? aPorId.get(id) : gPorId.get(id);
    const fonte = item?.[`${campo}Fonte`];
    if (!item || !item[campo] || !fonte) { erros.push(`${chave}: não existe ou não tem texto/fonte`); continue; }
    item[campo] = texto;
    fonte.traduzido = true;
    aplicadas++;
  }
}

fs.writeFileSync(ARQ_GENEROS, JSON.stringify(generos, null, 2) + "\n");
fs.writeFileSync(ARQ_ALBUNS, JSON.stringify(albuns, null, 2) + "\n");
console.log(`${aplicadas} traduções aplicadas.`);
for (const e of erros) console.log("ERRO:", e);
