// Encontra, em cada resumo, menções a outros gêneros da árvore.
// Usado por ligar-resumos.js (grava) e validar-generos.js (confere se está atualizado).
//
// Regras:
// - procura o "nome" e os "nomesAlternativos" de cada gênero, sem diferenciar maiúsculas;
//   espaço e hífen são equivalentes ("hip hop" = "hip-hop");
// - só casa palavras inteiras (hífen conta como parte da palavra, então "rock" não casa dentro de "post-rock");
// - termos mais longos têm prioridade ("hard rock" vence "rock"), e todo trecho reconhecido fica
//   reservado, mesmo sem virar link: assim "Delta blues" no resumo do próprio Delta Blues não liga "blues";
// - cada gênero é ligado só na primeira menção, e o gênero nunca liga para si mesmo;
// - "ligarPeloNome": false tira o nome do gênero da busca (só os nomesAlternativos contam),
//   para nomes que no texto quase sempre significam outra coisa;
// - TERMOS_FORA_DA_ARVORE são gêneros que contêm um nome da árvore mas não são ele.

const TERMOS_FORA_DA_ARVORE = [
  "breakbeat hardcore", "southern rock", "acid rock", "art rock", "country blues",
  "power ambient", "drone doom", "road rap",
  "witch house", "electro house", "new wave of traditional", "pop punk",
];

function escapar(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[\\s-]+");
}

function termos(generos) {
  const lista = TERMOS_FORA_DA_ARVORE.map((termo) => ({ termo, id: null }));
  for (const g of generos) {
    const nomes = [...(g.ligarPeloNome === false ? [] : [g.nome]), ...(g.nomesAlternativos || [])];
    for (const termo of nomes) lista.push({ termo, id: g.id });
  }
  return lista
    .sort((a, b) => b.termo.length - a.termo.length)
    .map((x) => ({ ...x, re: new RegExp(`(?<![\\p{L}\\p{N}-])${escapar(x.termo)}(?![\\p{L}\\p{N}-])`, "giu") }));
}

// Primeira menção de cada gênero num texto qualquer; `ignorar` é o gênero dono do texto.
function mencoes(texto, lista, ignorar = null) {
  const reservados = [];
  const links = [];
  const ligados = new Set([ignorar]);
  for (const { id, re } of lista) {
    re.lastIndex = 0;
    for (let m; (m = re.exec(texto)); ) {
      const de = m.index, ate = m.index + m[0].length;
      if (reservados.some((r) => de < r.ate && ate > r.de)) continue;
      reservados.push({ de, ate });
      if (id && !ligados.has(id)) {
        links.push({ de, ate, genero: id });
        ligados.add(id);
      }
    }
  }
  return links.sort((a, b) => a.de - b.de);
}

// `campo`: texto do gênero onde procurar ("resumo" ou "som").
function calcularLinks(generos, campo = "resumo") {
  const lista = termos(generos);
  const resultado = new Map();
  for (const g of generos) if (g[campo]) resultado.set(g.id, mencoes(g[campo], lista, g.id));
  return resultado;
}

module.exports = { calcularLinks, mencoes, termos };
