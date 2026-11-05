// Tira dos textos as notas sobre pronúncia: "(pronuncia-se [ˈkʌntri])", "(pronúncia: [fânc])",
// "(inglês: [iːmoʊˈkɔr])", ", pronúncia em português: [kɐi pɔp]". Pedido do usuário (05/11/2026).
// Nomes em outra escrita ("em japonês: シティ・ポップ") não são notas de pronúncia e ficam.
// buscar-resumos.js, buscar-som.js e buscar-sobre-albuns.js usam semPronuncia ao baixar os textos.
// Rodado direto, limpa data/albuns/albuns.json e data/generos/generos.json.
// Uso: node scripts/limpar-pronuncia.js

const fs = require("fs");
const path = require("path");

const NOTA = "pron[úu]ncia|pronuncia-se|pronounced|pronunciation";

function semPronuncia(s) {
  if (!s) return s;
  return s
    .replace(new RegExp(`[,;]\\s*(?:${NOTA})[^()\\[\\]]*:?\\s*\\[[^\\]]*\\]`, "gi"), "") // dentro de outro parêntese
    .replace(new RegExp(`\\s*\\([^()]*(?:${NOTA})[^()]*\\)`, "gi"), "") // parêntese inteiro
    .replace(/\s*\((?:[^()[\]]*:\s*)?\[[^\]]*\]\)/g, "") // só a transcrição: "(inglês: [...])"
    .trim();
}

module.exports = { semPronuncia };

if (require.main === module) {
  const RAIZ = path.join(__dirname, "..");
  const limpar = (arq, campos) => {
    const lista = JSON.parse(fs.readFileSync(arq, "utf8"));
    let n = 0;
    for (const item of lista) for (const c of campos) {
      if (typeof item[c] !== "string") continue;
      const novo = semPronuncia(item[c]);
      if (novo !== item[c]) { console.log(`${item.id} (${c})\n  antes: ${item[c].slice(0, 130)}\n  depois: ${novo.slice(0, 130)}`); item[c] = novo; n++; }
    }
    fs.writeFileSync(arq, JSON.stringify(lista, null, 2) + "\n");
    return n;
  };
  const a = limpar(path.join(RAIZ, "data", "albuns", "albuns.json"), ["sobre"]);
  const g = limpar(path.join(RAIZ, "data", "generos", "generos.json"), ["resumo", "som"]);
  console.log(`${a + g} textos limpos`);
}
