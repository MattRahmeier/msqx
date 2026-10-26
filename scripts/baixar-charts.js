// Indexa e baixa as imagens das Essential Charts do /mu/ (4chanmusic.miraheze.org/wiki/Essential_Charts).
// Uso: node scripts/baixar-charts.js [--indice] [--somente-arvore]
//   --indice          só gera data/charts/mu-essential-charts.json, sem baixar imagens
//   --somente-arvore  baixa só os charts ligados a gêneros da árvore
// As imagens vão para fontes/mu-charts/ (fora do git: são colagens de capas com direitos reservados).
// Arquivos já baixados com o mesmo tamanho são pulados, então o script pode ser rodado de novo.

const fs = require("fs");
const path = require("path");
const { mencoes, termos } = require("./links-resumo");

const RAIZ = path.join(__dirname, "..");
const API = "https://4chanmusic.miraheze.org/w/api.php";
const PAGINA = "https://4chanmusic.miraheze.org/wiki/Essential_Charts";
const UA = { "User-Agent": "MusiqueScout/0.1 (https://github.com/MattRahmeier/musique-scout)" };
const SAIDA_IMG = path.join(RAIZ, "fontes", "mu-charts");
const INDICE = path.join(RAIZ, "data", "charts", "mu-essential-charts.json");
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const r = await fetch(`${API}?` + new URLSearchParams({ format: "json", ...params }), { headers: UA });
  if (!r.ok) throw new Error(`wiki respondeu ${r.status}`);
  await espera(1000);
  return r.json();
}

const kebab = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

(async () => {
  const somenteIndice = process.argv.includes("--indice");
  const somenteArvore = process.argv.includes("--somente-arvore");

  // 1. Galerias da página: "Arquivo.jpg|Legenda", agrupadas pela seção (=== Título ===).
  const wikitext = (await api({ action: "parse", page: "Essential_Charts", prop: "wikitext" })).parse.wikitext["*"];
  const charts = [];
  let secao = null;
  for (const linha of wikitext.split("\n")) {
    const s = linha.match(/^===\s*(.+?)\s*===/);
    if (s) { secao = s[1]; continue; }
    const m = linha.match(/^([^|<>=\[\]]+\.(?:jpe?g|png|gif|webp))\s*\|\s*(.+)$/i);
    if (m && secao) charts.push({ arquivo: m[1].trim(), titulo: m[2].replace(/<[^>]+>/g, "").trim(), secao });
  }

  // 2. URL, tamanho e dimensões de cada imagem (50 por chamada).
  const info = new Map();
  for (let i = 0; i < charts.length; i += 50) {
    const lote = charts.slice(i, i + 50).map((c) => `File:${c.arquivo}`);
    const r = await api({ action: "query", prop: "imageinfo", iiprop: "url|size|mime", titles: lote.join("|") });
    const nome = new Map();
    for (const n of r.query.normalized || []) nome.set(n.to, n.from);
    for (const p of Object.values(r.query.pages)) {
      const pedido = (nome.get(p.title) || p.title).replace(/^File:/, "");
      if (p.imageinfo) info.set(pedido, p.imageinfo[0]);
    }
  }

  // 3. Gêneros da árvore citados no título do chart.
  const generos = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "generos", "generos.json"), "utf8"));
  const lista = termos(generos);
  const usados = new Set();
  const indice = charts.map((c) => {
    let id = kebab(c.titulo) || kebab(c.arquivo);
    while (usados.has(id)) id += "-b";
    usados.add(id);
    const ii = info.get(c.arquivo);
    return {
      id, titulo: c.titulo, secao: c.secao,
      generos: mencoes(c.titulo, lista).map((l) => l.genero),
      arquivoWiki: c.arquivo,
      url: ii?.url || null,
      bytes: ii?.size || null, largura: ii?.width || null, altura: ii?.height || null,
      imagemLocal: ii ? `fontes/mu-charts/${id}${path.extname(ii.url).toLowerCase()}` : null,
      fonte: PAGINA,
    };
  });
  fs.writeFileSync(INDICE, JSON.stringify(indice, null, 2) + "\n");

  const semImagem = indice.filter((c) => !c.url);
  const naArvore = indice.filter((c) => c.generos.length);
  const mb = (l) => (l.reduce((s, c) => s + (c.bytes || 0), 0) / 1e6).toFixed(0);
  console.log(`${indice.length} charts (${mb(indice)} MB) · ${naArvore.length} ligados à árvore (${mb(naArvore)} MB) · ${semImagem.length} sem imagem na wiki`);
  if (somenteIndice) return;

  // 4. Download, um por vez.
  fs.mkdirSync(SAIDA_IMG, { recursive: true });
  const alvo = (somenteArvore ? naArvore : indice).filter((c) => c.url);
  let baixados = 0, pulados = 0, falhas = [];
  for (const c of alvo) {
    const destino = path.join(RAIZ, c.imagemLocal);
    if (fs.existsSync(destino) && fs.statSync(destino).size === c.bytes) { pulados++; continue; }
    try {
      const r = await fetch(c.url, { headers: UA });
      if (!r.ok) throw new Error(String(r.status));
      fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
      baixados++;
      if (baixados % 25 === 0) console.log(`  ${baixados + pulados}/${alvo.length}`);
    } catch (e) {
      falhas.push(`${c.id}: ${e.message}`);
    }
    await espera(500);
  }
  console.log(`Baixados: ${baixados} · já existiam: ${pulados} · falhas: ${falhas.length}`);
  for (const f of falhas) console.log("  falha:", f);
})();
