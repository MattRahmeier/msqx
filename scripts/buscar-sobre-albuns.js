// Preenche "sobre" e "reviews" das fichas (data/albuns/albuns.json) a partir da Wikipédia.
//   sobre   — primeiras frases do artigo do álbum (português; sem artigo em português, inglês),
//             copiadas sem alteração (texto escrito por pessoas, CC BY-SA 4.0), com "sobreFonte".
//   reviews — notas da crítica listadas no quadro "Professional ratings" (predefinição
//             {{Album ratings}}) do artigo em inglês: veículo, nota original, nota em estrelas
//             (0–5) e link da crítica quando a referência tem. Só a nota e o link — o texto das
//             críticas tem direitos reservados e não é copiado. Guarda as duas melhores
//             (estrelas >= 3.5); no empate, os veículos de VEICULOS vêm primeiro.
// O artigo vem do Wikidata ligado ao release-group no MusicBrainz; sem ele, de uma busca na
// Wikipédia em inglês conferida pelo quadro "Infobox album" e pelo nome do artista.
// Uso: node scripts/buscar-sobre-albuns.js [--refazer id1,id2] [--limite N]
//   fichas já processadas (campo "sobreVerificado") são puladas.

const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "data", "albuns", "albuns.json");
const UA = { "User-Agent": "Tracklore/0.1 (https://github.com/MattRahmeier/tracklore)" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const arg = (nome) => { const i = process.argv.indexOf(nome); return i > -1 ? process.argv[i + 1] : null; };
const limite = Number(arg("--limite")) || Infinity;
const refazer = new Set((arg("--refazer") || "").split(",").filter(Boolean));
const MAX_SOBRE = 550;

// Veículos preferidos, nesta ordem, no empate de notas.
const VEICULOS = ["AllMusic", "Pitchfork", "Rolling Stone", "The Guardian", "NME", "Mojo", "Q", "Uncut",
  "The Village Voice", "Spin", "Entertainment Weekly", "The Independent", "Record Collector", "Tiny Mix Tapes",
  "PopMatters", "Slant Magazine", "Consequence", "Exclaim!", "The A.V. Club", "DownBeat", "The Penguin Guide to Jazz"];

const ultimo = {};
async function pedir(servico, url, intervalo) {
  const agora = Date.now();
  if (agora - (ultimo[servico] || 0) < intervalo) await espera(intervalo - (agora - (ultimo[servico] || 0)));
  ultimo[servico] = Date.now();
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(url, { headers: { ...UA, Accept: "application/json" } });
      if (r.ok) return r.json();
      if (r.status === 404) return null;
    } catch { /* tenta de novo */ }
    await espera(5000 * (t + 1));
  }
  return null;
}
const mb = (caminho) => pedir("mb", `https://musicbrainz.org/ws/2/${caminho}`, 1100);
const wiki = (lang, params) => pedir("wiki", `https://${lang}.wikipedia.org/w/api.php?` +
  new URLSearchParams({ format: "json", formatversion: "2", redirects: "1", ...params }), 400);

const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");

// --- artigo do álbum ---
// Outras Wikipédias, na ordem em que são tentadas quando não há artigo em português nem em inglês
// (o texto delas é traduzido depois, com scripts/aplicar-traducoes.js).
const OUTROS = ["es", "fr", "de", "it", "nl", "sv", "no", "fi", "da", "pl", "cs", "hu", "ru", "uk", "ja"];
const CORRECOES = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "albuns", "correcoes.json"), "utf8")); } catch { return {}; } })();

async function artigos(ficha) {
  // Artigo escolhido à mão em correcoes.json: { "sobreArtigo": "en:Dr. Octagonecologyst" }.
  const manual = CORRECOES[ficha.id]?.sobreArtigo;
  if (manual) { const [lang, ...t] = manual.split(":"); return { [lang]: t.join(":") }; }
  const rg = ficha.musicbrainz?.releaseGroup && await mb(`release-group/${ficha.musicbrainz.releaseGroup}?fmt=json&inc=url-rels`);
  const qid = rg?.relations?.find((r) => r.type === "wikidata")?.url?.resource.split("/").pop();
  if (qid) {
    const w = await pedir("wiki", `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&sitefilter=${["pt", "en", ...OUTROS].map((l) => l + "wiki").join("|")}&ids=${qid}`, 400);
    const s = w?.entities?.[qid]?.sitelinks || {};
    const achados = Object.fromEntries(["pt", "en", ...OUTROS].filter((l) => s[l + "wiki"]).map((l) => [l, s[l + "wiki"].title]));
    if (Object.keys(achados).length) return achados;
  }
  // Sem Wikidata: busca no inglês e confere o quadro do álbum e o artista.
  const busca = await wiki("en", { action: "query", list: "search", srlimit: "5", srsearch: `${ficha.titulo} ${ficha.artista} album` });
  for (const r of busca?.query?.search || []) {
    if (!norm(r.title).startsWith(norm(ficha.titulo))) continue;
    const texto = await wikitexto("en", r.title);
    const quadro = texto?.match(/\{\{\s*Infobox album[\s\S]*?\|\s*artist\s*=([^\n|]*)/i);
    if (quadro && norm(quadro[1]).includes(norm(ficha.artista.split(/,|&| and /)[0]))) return { en: r.title, texto };
  }
  return {};
}

async function wikitexto(lang, titulo) {
  const r = await wiki(lang, { action: "parse", page: titulo, prop: "wikitext" });
  return r?.parse?.wikitext || null;
}

// `album`: título do álbum. O texto precisa citá-lo ou começar falando de um álbum (evita artigos
// de outro assunto, como um redirecionamento para a página da banda).
async function introducao(lang, titulo, album) {
  const r = await wiki(lang, { action: "query", prop: "extracts", exintro: "1", explaintext: "1", titles: titulo });
  const p = r?.query?.pages?.[0];
  if (!p?.extract) return null;
  const frases = p.extract.replace(/\s*\([^()]*\/[^()]*\)/g, "").replace(/\s+/g, " ").trim()
    .split(/(?<!\b(?:Dr|Mr|Mrs|St|Jr|Sr|vs|Vol|Vols|vol|No|[A-Z])\.)(?<=[.!?]["”]?)\s+(?=["“(]?[A-ZÀ-Ý0-9])/);
  let texto = frases[0] || "";
  for (let i = 1; i < 3 && i < frases.length && (texto + " " + frases[i]).length <= MAX_SOBRE; i++) texto += " " + frases[i];
  // O texto é sobre o álbum se cita o título ou se a primeira frase fala de um álbum.
  const sobreOAlbum = norm(texto).includes(norm(album)) || /\b(álbum|album|albumet|albumi|albumu|EP|LP|disco|disque|compilação|compilation|coletânea|Sampler)\b|アルバム|альбом/i.test(frases[0] || "");
  return texto.length >= 40 && sobreOAlbum ? { titulo: p.title, texto } : null;
}

// --- notas da crítica ---
// Conteúdo de {{Album ratings ...}} com chaves balanceadas.
function quadroNotas(texto) {
  const i = texto.search(/\{\{\s*(Album|Music) ratings/i);
  if (i < 0) return null;
  let nivel = 0;
  for (let j = i; j < texto.length - 1; j++) {
    if (texto[j] === "{" && texto[j + 1] === "{") { nivel++; j++; }
    else if (texto[j] === "}" && texto[j + 1] === "}") { nivel--; j++; if (nivel === 0) return texto.slice(i, j + 1); }
  }
  return null;
}

// Separa os campos "| revN = ..." no primeiro nível (ignora "|" dentro de {{ }} e [[ ]]).
function campos(quadro) {
  const corpo = quadro.replace(/^\{\{[^|]*/, "").replace(/\}\}$/, "");
  const partes = [];
  let nivel = 0, atual = "";
  for (let j = 0; j < corpo.length; j++) {
    const d = corpo.slice(j, j + 2);
    if (d === "{{" || d === "[[") { nivel++; atual += d; j++; continue; }
    if (d === "}}" || d === "]]") { nivel--; atual += d; j++; continue; }
    if (corpo[j] === "|" && nivel === 0) { partes.push(atual); atual = ""; continue; }
    atual += corpo[j];
  }
  partes.push(atual);
  const saida = {};
  for (const p of partes) { const m = p.match(/^\s*([\w ]+?)\s*=([\s\S]*)$/); if (m) saida[m[1].toLowerCase()] = m[2].trim(); }
  return saida;
}

// Grafias diferentes do mesmo veículo.
const NOMES = { allmusic: "AllMusic", "all music guide": "AllMusic", pitchfork: "Pitchfork", "pitchfork media": "Pitchfork" };
const nomeVeiculo = (s) => NOMES[s.toLowerCase()] || s;

const semMarcas = (s) => s.replace(/<ref[\s\S]*?(\/>|<\/ref>)/g, "").replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
  .replace(/''+/g, "").replace(/\{\{[^}]*\}\}/g, "").replace(/<[^>]+>/g, "").trim();

const CONCEITOS = { "A+": 5, A: 5, "A-": 4.5, "B+": 4, B: 3.5, "B-": 3, "C+": 2.5, C: 2, "C-": 1.5, "D+": 1, D: 1, "D-": 0.5, E: 0, F: 0 };

// Nota original → { nota, estrelas } (estrelas de 0 a 5, em meios).
function converter(bruto) {
  const s = bruto.replace(/<ref[\s\S]*?(\/>|<\/ref>)/g, "").trim();
  const meio = (x) => Math.round(x * 2) / 2;
  let m = s.match(/\{\{\s*Rating\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/i);
  if (m) return { nota: `${m[1]}/${m[2]}`, estrelas: meio((m[1] / m[2]) * 5) };
  m = s.match(/\{\{\s*Rating-Christgau\s*\|\s*([^}|]+)/i) || s.match(/^\s*([A-F][+\-−–]?)\s*(?:$|\()/);
  if (m) {
    const c = m[1].trim().replace(/[−–]/g, "-");
    if (c in CONCEITOS) return { nota: c.replace("-", "−"), estrelas: CONCEITOS[c] };
    return null; // "dud", "choice cut" etc.
  }
  m = s.replace(/\{\{[^}]*\}\}/g, "").match(/([\d.]+)\s*\/\s*(10|5|100)\b/);
  if (m) return { nota: `${m[1]}/${m[2]}`, estrelas: meio((m[1] / m[2]) * 5) };
  return null;
}

// Link da crítica: url= da referência no campo, ou da referência nomeada definida em outro lugar.
function linkDe(bruto, texto) {
  const dentro = bruto.match(/<ref[^>]*>([\s\S]*?)<\/ref>/)?.[1];
  const nome = bruto.match(/<ref\s+name\s*=\s*"?([^"/>]+?)"?\s*\/?>/)?.[1];
  const def = dentro || (nome && texto.match(new RegExp(`<ref\\s+name\\s*=\\s*"?${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"?\\s*>([\\s\\S]*?)<\\/ref>`))?.[1]);
  const url = def?.match(/\|\s*url\s*=\s*(https?:\/\/[^\s|}]+)/)?.[1] || def?.match(/https?:\/\/[^\s|}\]]+/)?.[0];
  // Só links para a própria crítica (não fotos, livros digitalizados ou cópias arquivadas).
  return url && !/flickr\.com|books\.google|archive\.org|archive\.is|archive\.today/.test(url) ? url : null;
}

function reviews(texto) {
  const quadro = quadroNotas(texto);
  if (!quadro) return [];
  const c = campos(quadro);
  const lista = [];
  for (let n = 1; n <= 30; n++) {
    const fonte = c[`rev${n}`], nota = c[`rev${n}score`];
    if (!fonte || !nota) continue;
    const conv = converter(nota);
    if (!conv) continue;
    lista.push({ fonte: nomeVeiculo(semMarcas(fonte)), ...conv, url: linkDe(nota, texto) });
  }
  const pos = (r) => { const i = VEICULOS.findIndex((v) => r.fonte.toLowerCase().includes(v.toLowerCase())); return i < 0 ? VEICULOS.length : i; };
  return lista.filter((r) => r.estrelas >= 3.5 && r.fonte)
    .sort((a, b) => b.estrelas - a.estrelas || pos(a) - pos(b))
    .slice(0, 2);
}

const urlDe = (lang, titulo) => `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(titulo.replace(/ /g, "_"))}`;

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const salvar = () => fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  const hoje = new Date().toISOString().slice(0, 10);
  let feitos = 0;
  for (const f of fichas) {
    if (feitos >= limite) break;
    if (f.sobreVerificado && !refazer.has(f.id)) continue;
    if (!f.musicbrainz && !f.titulo) continue;
    for (const k of ["sobre", "sobreFonte", "reviews", "sobrePendente"]) delete f[k];

    const art = await artigos(f);
    let intro = null;
    for (const lang of ["pt", "en", ...OUTROS]) {
      const achado = art[lang] && await introducao(lang, art[lang], f.titulo);
      if (achado) { intro = { lang, ...achado }; break; }
    }
    if (intro?.texto) {
      f.sobre = intro.texto;
      f.sobreFonte = { url: urlDe(intro.lang, intro.titulo), idioma: intro.lang, licenca: "CC BY-SA 4.0" };
    } else f.sobrePendente = "sem artigo na Wikipédia";
    const texto = art.en ? (art.texto || await wikitexto("en", art.en)) : null;
    const r = texto ? reviews(texto) : [];
    if (r.length) f.reviews = r.map((x) => ({ ...x, via: urlDe("en", art.en) + "#Critical_reception" }));
    f.sobreVerificado = hoje;
    feitos++;
    console.log(`${f.sobre ? "✓" : "–"} ${f.id}${f.reviews ? `  [${f.reviews.map((x) => `${x.fonte} ${x.nota}`).join("; ")}]` : ""}`);
    if (feitos % 10 === 0) salvar();
  }
  salvar();
  console.log(`\n${feitos} fichas · com "sobre": ${fichas.filter((f) => f.sobre).length} · com reviews: ${fichas.filter((f) => f.reviews).length}`);
})();
