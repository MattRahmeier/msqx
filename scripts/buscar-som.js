// Preenche "som" de data/generos/generos.json: como o gênero soa e quais elementos o definem.
// Texto escrito por pessoas: frases da Wikipédia que falam do som (instrumentos, ritmo, timbre,
// voz, produção), copiadas sem alteração (CC BY-SA 4.0). Usa o mesmo artigo do resumo e procura,
// nesta ordem: seção de características ("Características", "Estilo musical", "Characteristics"…)
// em português, em inglês, depois a introdução em português, em inglês. Sem trecho adequado, o
// gênero fica com "somPendente". O site mostra o som logo depois do resumo, no mesmo parágrafo.
// Uso: node scripts/buscar-som.js [--todos]
//   sem --todos, só processa gêneros sem "somFonte" (preserva ajustes manuais).
// Ajustes por gênero:
//   "somArtigo": "en:Bebop#Musical style"  artigo (e seção, depois de #; sem #, a introdução)
//   "somArtigo": false                     sem fonte adequada; fica pendente
//   "somFrases": 3                         quantas frases pegar (padrão 2)
//   "somPular": 1                          pula as primeiras frases encontradas (ex.: uma citação)
// Depois rode scripts/ligar-resumos.js para criar os links do texto.

const fs = require("fs");
const path = require("path");

const arquivo = path.join(__dirname, "..", "data", "generos", "generos.json");
const generos = JSON.parse(fs.readFileSync(arquivo, "utf8"));
const todos = process.argv.includes("--todos");
const UA = { "User-Agent": "Tracklore/0.1 (https://github.com/MattRahmeier/musique-scout)" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_CARACTERES = 600;

const SECOES = {
  pt: /^(caracter[ií]sticas?( (musicais|sonoras|e estilo))?|estilo( musical)?|som|sonoridade|elementos musicais|instrumenta[cç][aã]o|m[uú]sica)$/i,
  en: /^((musical )?characteristics|(musical )?style|style and characteristics|characteristics and style|sound|(musical )?elements|musical traits|instrumentation|music)$/i,
};

// Palavras que indicam que a frase fala do som (instrumentos, ritmo, timbre, voz, produção).
const SONORAS = {
  pt: /guitarr|baixo|bateria|percuss|ritm|andamento|batida|bpm|vocais|vocal|\bvoz|canto|sintetiz|teclado|piano|metais|saxofone|trompete|riff|acorde|distor|melodi|harmoni|timbr|textur|sampl|loop|instrument|improvis|grave|reverb|atmosf|sonorid|compasso|solos?\b/i,
  en: /guitar|\bbass|drum|percuss|rhythm|tempo|\bbeat|bpm|vocal|voice|singing|synth|keyboard|piano|horn|saxophone|trumpet|riff|chord|distort|melod|harmon|timbre|textur|sampl|loop|instrument|improvis|groove|reverb|atmospher|sound|solos?\b/i,
};

async function api(lang, params) {
  const url = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({ action: "query", format: "json", redirects: "1", ...params });
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) { await espera(1200); return r.json(); }
    } catch { /* tenta de novo */ }
    await espera(15000 * (t + 1));
  }
  throw new Error(`Wikipédia (${lang}) não respondeu`);
}

const tituloDe = (url) => decodeURIComponent(url.split("/wiki/")[1].split("#")[0]).replace(/_/g, " ");
const urlDe = (lang, titulo, secao) => `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(titulo.replace(/ /g, "_"))}${secao ? "#" + encodeURIComponent(secao.replace(/ /g, "_")) : ""}`;

async function textoCompleto(lang, titulo) {
  const r = await api(lang, { prop: "extracts", explaintext: "1", exsectionformat: "wiki", titles: titulo });
  const p = Object.values(r.query.pages)[0];
  return p?.extract ? { titulo: p.title, texto: p.extract } : null;
}

async function outroIdioma(lang, titulo, para) {
  const r = await api(lang, { prop: "langlinks", lllang: para, titles: titulo });
  return Object.values(r.query.pages)[0]?.langlinks?.[0]?.["*"] || null;
}

// Seções do texto plano: "== Título ==" / "=== Subtítulo ===".
function secoes(texto) {
  const partes = [];
  const re = /^(={2,})\s*(.+?)\s*\1\s*$/gm;
  let m, anterior = null;
  while ((m = re.exec(texto))) {
    if (anterior) anterior.texto = texto.slice(anterior.fim, m.index).trim();
    anterior = { nivel: m[1].length, titulo: m[2], fim: re.lastIndex };
    partes.push(anterior);
  }
  if (anterior) anterior.texto = texto.slice(anterior.fim).trim();
  return partes;
}

function limpar(s) {
  return s.replace(/\s*\([^()]*\/[^()]*\/[^()]*\)/g, "").replace(/\(\s*[;,]?\s*\)/g, "")
    .replace(/\s+/g, " ").replace(/\s+([,.;])/g, "$1").trim();
}

// Frases do texto que falam do som, na ordem em que aparecem (copiadas sem alteração).
// Linhas sem pontuação final (itens de lista) são ignoradas. Pula as `pular` primeiras; até `n`
// frases e MAX_CARACTERES.
function frasesDoSom(lang, texto, n, pular = 0) {
  const paragrafos = texto.split(/\n+/).map((p) => p.trim()).filter((p) => /[.!?"”)]$/.test(p));
  // Não corta depois de abreviações ("Dr. Dre", "J. S. Bach", "vol.").
  const todas = paragrafos.flatMap((p) => limpar(p).split(/(?<!\b(?:Dr|Mr|Mrs|St|Jr|Sr|vs|Vol|vol|ca|[A-Z])\.)(?<=[.!?]["”]?)\s+(?=["“(]?[A-ZÀ-Ý0-9])/));
  const termos = (f) => new Set((f.match(new RegExp(SONORAS[lang].source, "gi")) || []).map((t) => t.toLowerCase())).size;
  const candidatas = todas.filter((f) => f.length >= 40 && /^["“(]?[A-ZÀ-Ý0-9]/.test(f) && termos(f) > 0);
  // Prefere frases com dois ou mais elementos sonoros; se não houver, aceita as que têm um.
  const fortes = candidatas.filter((f) => termos(f) >= 2);
  const boas = fortes.length ? fortes : candidatas;
  let saida = "";
  for (const f of boas.slice(pular, pular + n)) {
    if (saida && (saida + " " + f).length > MAX_CARACTERES) break;
    saida = saida ? saida + " " + f : f;
  }
  return saida || null;
}

// Seção de características: a primeira cujo título bate, com as subseções dela.
function acharSecao(lang, texto, nomeForcado) {
  const lista = secoes(texto);
  const i = lista.findIndex((s) => (nomeForcado ? s.titulo.toLowerCase() === nomeForcado.toLowerCase() : SECOES[lang].test(s.titulo)));
  if (i < 0) return null;
  const partes = [lista[i].texto];
  for (let j = i + 1; j < lista.length && lista[j].nivel > lista[i].nivel; j++) partes.push(lista[j].texto);
  return { titulo: lista[i].titulo, texto: partes.join("\n") };
}

// Introdução do artigo (antes da primeira seção), sem o que já está no resumo.
function introducao(texto, resumo) {
  let intro = texto.split(/^={2,}/m)[0];
  if (resumo) intro = intro.replace(resumo, "");
  return intro.trim() ? { titulo: null, texto: intro } : null;
}

// Primeiro trecho que fala do som: seção de características em pt, em en; introdução pt, en.
async function buscar(g, titulos) {
  const artigos = {};
  for (const l of ["pt", "en"]) if (titulos[l]) artigos[l] = await textoCompleto(l, titulos[l]);
  const tentativas = [
    ...["pt", "en"].map((l) => [l, artigos[l] && acharSecao(l, artigos[l].texto)]),
    ...["pt", "en"].map((l) => [l, artigos[l] && introducao(artigos[l].texto, g.resumoFonte?.idioma === l ? g.resumo : null)]),
  ];
  for (const [l, s] of tentativas) {
    const texto = s && frasesDoSom(l, s.texto, g.somFrases || 2, g.somPular || 0);
    if (texto && texto !== g.resumo) return { lang: l, titulo: artigos[l].titulo, secao: s.titulo, texto };
  }
  return null;
}

(async () => {
  const alvo = generos.filter((g) => (todos || !g.somFonte) && g.somArtigo !== false);
  const usados = new Map(generos.filter((g) => g.somFonte && !alvo.includes(g)).map((g) => [g.somFonte.url, g.id]));
  const relatorio = { pt: [], en: [], pendente: [] };

  for (const g of alvo) {
    let achado = null;
    if (typeof g.somArtigo === "string") {
      const [lang, ...resto] = g.somArtigo.split(":");
      const [titulo, secao] = resto.join(":").split("#");
      const art = await textoCompleto(lang, titulo);
      const s = art && (secao ? acharSecao(lang, art.texto, secao) : introducao(art.texto));
      const texto = s && frasesDoSom(lang, s.texto, g.somFrases || 2, g.somPular || 0);
      if (texto) achado = { lang, titulo: art.titulo, secao: s.titulo, texto };
    } else {
      // Artigo da Wikipédia do resumo (ou o primeiro de "fontes") e sua versão no outro idioma.
      const base = [g.resumoFonte?.url, ...(g.fontes || [])].find((u) => /wikipedia\.org\/wiki\//.test(u || ""));
      if (base) {
        const lang = new URL(base).hostname.split(".")[0];
        const titulos = { [lang]: tituloDe(base) };
        const outro = lang === "pt" ? "en" : "pt";
        titulos[outro] = await outroIdioma(lang, titulos[lang], outro);
        achado = await buscar(g, titulos);
      }
    }

    delete g.som; delete g.somFonte; delete g.somPendente; delete g.somLinks;
    const url = achado && urlDe(achado.lang, achado.titulo, achado.secao);
    if (!achado) {
      g.somPendente = "artigo sem trecho sobre o som";
    } else if (usados.has(url)) {
      g.somPendente = `trecho compartilhado com "${usados.get(url)}" (${achado.titulo})`;
    } else {
      usados.set(url, g.id);
      g.som = achado.texto;
      g.somFonte = { url, idioma: achado.lang, ...(achado.secao ? { secao: achado.secao } : {}), licenca: "CC BY-SA 4.0" };
      relatorio[achado.lang].push(g.id);
    }
    if (g.somPendente) relatorio.pendente.push(`${g.id}: ${g.somPendente}`);
    console.log(`${g.som ? "✓" : "–"} ${g.id}${g.som ? ` (${achado.lang}: ${achado.secao || "introdução"})` : ""}`);
  }

  fs.writeFileSync(arquivo, JSON.stringify(generos, null, 2) + "\n");
  console.log(`\nPortuguês: ${relatorio.pt.length} · Inglês: ${relatorio.en.length} · Pendentes: ${relatorio.pendente.length}`);
  if (relatorio.pendente.length) console.log("  " + relatorio.pendente.join("\n  "));
})();
