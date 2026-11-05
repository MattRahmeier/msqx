// Preenche "resumo" de data/generos/generos.json com a primeira frase da Wikipédia
// (texto escrito por pessoas, licença CC BY-SA 4.0). Prefere o artigo em português;
// sem ele, usa o inglês. Gêneros que dividem o mesmo artigo com outro ficam pendentes.
// Uso: node scripts/buscar-resumos.js [--todos]
//   sem --todos, só processa gêneros que ainda não têm "resumoFonte" (preserva ajustes manuais).
// Ajustes por gênero, quando o artigo automático é vago ou errado:
//   "resumoArtigo": "pt:Heavy metal tradicional"  usa esse artigo (prefixo = idioma da Wikipédia)
//   "resumoArtigo": false                         sem artigo adequado; fica pendente
//   "resumoFrases": 2                             quantas frases pegar (padrão 1)

const fs = require("fs");
const { semPronuncia } = require("./limpar-pronuncia.js");
const path = require("path");

const arquivo = path.join(__dirname, "..", "data", "generos", "generos.json");
const generos = JSON.parse(fs.readFileSync(arquivo, "utf8"));
const todos = process.argv.includes("--todos");
const UA = { "User-Agent": "Tracklore/0.1 (https://github.com/MattRahmeier/tracklore)" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(lang, params) {
  const url = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({ action: "query", format: "json", redirects: "1", ...params });
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) { await espera(1500); return r.json(); }
    await espera(15000 * (tentativa + 1));
  }
  throw new Error(`Wikipédia (${lang}) não respondeu`);
}

// Resolve redirecionamentos: título pedido → título final.
function resolvidos(q) {
  const m = new Map();
  for (const n of q.normalized || []) m.set(n.from, n.to);
  for (const r of q.redirects || []) m.set(r.from, r.to);
  return (t) => { let x = t; for (let i = 0; i < 3 && m.has(x); i++) x = m.get(x); return x; };
}

async function primeirasFrases(lang, titulos, frases = 1) {
  const saida = new Map();
  for (let i = 0; i < titulos.length; i += 20) {
    const lote = titulos.slice(i, i + 20);
    const r = await api(lang, { prop: "extracts", exintro: "1", explaintext: "1", exsentences: String(frases), exlimit: "20", titles: lote.join("|") });
    const final = resolvidos(r.query);
    const porTitulo = new Map(Object.values(r.query.pages).map((p) => [p.title, p]));
    for (const t of lote) {
      const p = porTitulo.get(final(t));
      if (p && p.extract) saida.set(t, { titulo: p.title, texto: limpar(p.extract) });
    }
  }
  return saida;
}

function limpar(s) {
  return semPronuncia(s).replace(/\s*\([^()]*\/[^()]*\/[^()]*\)/g, "") // pronúncia IPA
    .replace(/\(\s*[;,]?\s*\)/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
}

(async () => {
  const alvo = generos.filter((g) => todos || !g.resumoFonte);
  const enTitulo = (g) => decodeURIComponent(g.fontes[0].split("/wiki/")[1]).replace(/_/g, " ");
  const automaticos = alvo.filter((g) => g.resumoArtigo === undefined);

  // 0. Artigos escolhidos à mão.
  const manual = new Map();
  for (const g of alvo.filter((g) => typeof g.resumoArtigo === "string")) {
    const [lang, ...resto] = g.resumoArtigo.split(":");
    const titulo = resto.join(":");
    const achado = (await primeirasFrases(lang, [titulo], g.resumoFrases || 1)).get(titulo);
    if (achado) manual.set(g.id, { lang, ...achado });
  }

  // 1. Artigo em inglês final de cada gênero + link para o português.
  const ptDe = new Map();
  const enFinal = new Map();
  const titulos = [...new Set(automaticos.map(enTitulo))];
  for (let i = 0; i < titulos.length; i += 50) {
    const lote = titulos.slice(i, i + 50);
    const r = await api("en", { prop: "langlinks", lllang: "pt", lllimit: "max", titles: lote.join("|") });
    const final = resolvidos(r.query);
    const porTitulo = new Map(Object.values(r.query.pages).map((p) => [p.title, p]));
    for (const t of lote) {
      const p = porTitulo.get(final(t));
      enFinal.set(t, final(t));
      if (p?.langlinks?.[0]) ptDe.set(t, p.langlinks[0]["*"]);
    }
  }

  // 2. Primeira frase em português; inglês para o resto.
  const pt = await primeirasFrases("pt", [...new Set(ptDe.values())]);
  const semPt = titulos.filter((t) => !pt.has(ptDe.get(t)));
  const en = await primeirasFrases("en", semPt);

  // 3. Grava, marcando artigos repetidos como pendentes.
  const usados = new Map(generos.filter((g) => g.resumoFonte && !alvo.includes(g)).map((g) => [g.resumoFonte.url, g.id]));
  const relatorio = { pt: [], en: [], pendente: [], revisar: [] };
  // Artigos escolhidos à mão têm prioridade na disputa por um artigo compartilhado.
  for (const g of [...alvo].sort((a, b) => manual.has(b.id) - manual.has(a.id))) {
    const t = enTitulo(g);
    const achado = g.resumoArtigo === false ? null
      : manual.get(g.id) || (pt.get(ptDe.get(t)) ? { lang: "pt", ...pt.get(ptDe.get(t)) } : en.get(t) ? { lang: "en", ...en.get(t) } : null);
    const url = achado && `https://${achado.lang}.wikipedia.org/wiki/${encodeURIComponent(achado.titulo.replace(/ /g, "_"))}`;
    let campos;
    if (g.resumoArtigo === false) {
      campos = { resumo: "", resumoPendente: "sem artigo próprio na Wikipédia" };
    } else if (!achado) {
      campos = { resumo: "", resumoPendente: "sem artigo na Wikipédia" };
    } else if (usados.has(url)) {
      campos = { resumo: "", resumoPendente: `artigo compartilhado com "${usados.get(url)}" (${achado.titulo})` };
    } else {
      usados.set(url, g.id);
      campos = { resumo: achado.texto, resumoFonte: { url, idioma: achado.lang, licenca: "CC BY-SA 4.0" } };
      (relatorio[achado.lang] ||= []).push(g.id);
      if (achado.texto.length < 50 || achado.texto.length > 400) relatorio.revisar.push(`${g.id} (${achado.texto.length} caracteres)`);
    }
    if (campos.resumoPendente) relatorio.pendente.push(`${g.id}: ${campos.resumoPendente}`);
    delete g.resumoPendente; delete g.resumoFonte;
    // Mantém a ordem dos campos: resumo e sua fonte logo após "origens".
    const { id, nome, pai, mestre, decada, origens, resumo, resumoArtigo, resumoFrases, ...resto } = g;
    if (resumoArtigo !== undefined) campos.resumoArtigo = resumoArtigo;
    if (resumoFrases !== undefined) campos.resumoFrases = resumoFrases;
    Object.keys(g).forEach((k) => delete g[k]);
    Object.assign(g, { id, nome, pai, mestre, decada, origens, ...campos, ...resto });
  }

  fs.writeFileSync(arquivo, JSON.stringify(generos, null, 2) + "\n");
  console.log(`Português: ${relatorio.pt.length} · Inglês: ${relatorio.en.length} (${relatorio.en.join(", ")})`);
  if (relatorio.revisar.length) console.log(`Revisar tamanho: ${relatorio.revisar.join(", ")}`);
  if (relatorio.pendente.length) console.log("Pendentes:\n  " + relatorio.pendente.join("\n  "));
})();
