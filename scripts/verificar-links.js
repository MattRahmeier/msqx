// Verifica os links de streaming das fichas (data/albuns/albuns.json): remove os quebrados e
// procura o álbum exato no YouTube Music (playlist oficial do álbum, "OLAK5uy_…").
// Uso: node scripts/verificar-links.js [--refazer id1,id2] [--limite N]
//   Fichas já verificadas (campo linksVerificados) são puladas.
//
// Como cada serviço é conferido:
//   spotify   — oEmbed do Spotify (404 quando o álbum não existe)
//   deezer    — API pública do Deezer (resposta com "error" quando não existe)
//   appleMusic, tidal, qobuz — a própria página (404 quando não existe; o Qobuz redireciona
//               para a loja do país e responde 404 se o álbum não está à venda nela)
//   youtubeMusic — busca de álbuns do YouTube Music; aceita só resultado do mesmo artista e
//               com o mesmo título (ignorando "(Remastered)", "(Deluxe)" etc.)
//   bandcamp  — não é conferido: o Bandcamp bloqueia acesso automatizado.

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const ARQ_FICHAS = path.join(RAIZ, "data", "albuns", "albuns.json");
const PASTA_CHARTS = path.join(RAIZ, "data", "charts", "mu");
const UA = { "User-Agent": "Mozilla/5.0 (Tracklore link check; https://github.com/MattRahmeier/tracklore)" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const arg = (nome) => { const i = process.argv.indexOf(nome); return i > -1 ? process.argv[i + 1] : null; };
const limite = Number(arg("--limite")) || Infinity;
const refazer = new Set((arg("--refazer") || "").split(",").filter(Boolean));

const kebab = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/&/g, " and ").replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const norm = (s) => kebab(s).replace(/^the-/, "").replace(/-and-/g, "-");
// Tira sufixos de edição: "Dare (Remastered 2012)", "Loveless [Deluxe]", "X - 2009 Remaster".
const semEdicao = (s) => (s || "").replace(/\s*[([][^)\]]*(remaster|deluxe|edition|version|expanded|anniversary|reissue|mono|stereo|bonus)[^)\]]*[)\]]/gi, "")
  .replace(/\s+-\s+.*(remaster|edition|version).*$/i, "").trim();

// Uma requisição por vez por serviço, com intervalo.
const ultimo = {};
async function pedir(servico, url, opcoes = {}, intervalo = 400) {
  const agora = Date.now();
  if (agora - (ultimo[servico] || 0) < intervalo) await espera(intervalo - (agora - (ultimo[servico] || 0)));
  ultimo[servico] = Date.now();
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: "follow", ...opcoes });
      if (r.status === 429 || r.status >= 500) { await espera(4000 * (t + 1)); continue; }
      return r;
    } catch { await espera(3000 * (t + 1)); }
  }
  return null; // sem resposta: não dá para afirmar que está quebrado
}

// true = funciona, false = quebrado, null = não deu para conferir
const CONFERIR = {
  async spotify(u) {
    const r = await pedir("spotify", `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`);
    return r ? r.ok : null;
  },
  async deezer(u) {
    const id = u.match(/album\/(\d+)/)?.[1];
    if (!id) return false;
    const r = await pedir("deezer", `https://api.deezer.com/album/${id}`);
    if (!r) return null;
    const j = await r.json().catch(() => null);
    return !!j && !j.error;
  },
  async appleMusic(u) {
    const r = await pedir("apple", u);
    return r ? r.ok && /\/album\//.test(r.url) : null;
  },
  async tidal(u) {
    const r = await pedir("tidal", u);
    return r ? r.ok : null;
  },
  async qobuz(u) {
    const r = await pedir("qobuz", u.replace(/^http:/, "https:"));
    return r ? r.ok && /\/album\//.test(r.url) : null;
  },
};

// --- YouTube Music ---
const YT_CTX = { client: { clientName: "WEB_REMIX", clientVersion: "1.20241023.01.00", hl: "en", gl: "BR" } };
const YT_H = { "Content-Type": "application/json", Origin: "https://music.youtube.com", Referer: "https://music.youtube.com/" };
const FILTRO_ALBUNS = "EgWKAQIYAWoMEA4QChADEAQQCRAF";
const andar = (o, f, saida = []) => {
  if (o && typeof o === "object") { if (f(o)) saida.push(o); for (const v of Object.values(o)) andar(v, f, saida); }
  return saida;
};
async function yt(endpoint, corpo) {
  const r = await pedir("youtube", `https://music.youtube.com/youtubei/v1/${endpoint}?prettyPrint=false`,
    { method: "POST", headers: { ...UA, ...YT_H }, body: JSON.stringify({ context: YT_CTX, ...corpo }) }, 1200);
  return r?.ok ? r.json() : null;
}

async function youtubeMusic(ficha, tituloChart) {
  const primeiro = norm(ficha.artista.split(/,|&| and | e |•/)[0]);
  const titulos = new Set([norm(ficha.titulo), norm(tituloChart)].filter(Boolean));
  const busca = await yt("search", { query: `${ficha.artista} ${tituloChart || ficha.titulo}`, params: FILTRO_ALBUNS });
  if (!busca) return null;
  const itens = andar(busca, (o) => o.musicResponsiveListItemRenderer).map((o) => {
    const r = o.musicResponsiveListItemRenderer;
    const colunas = (r.flexColumns || []).map((c) => (c.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []).map((x) => x.text).join(""));
    const id = andar(r, (x) => typeof x.browseId === "string" && x.browseId.startsWith("MPREb"))[0]?.browseId;
    return { titulo: colunas[0] || "", info: colunas[1] || "", id };
  });
  // Mesmo artista e mesmo título; entre esses, prefere o título sem sufixo de edição.
  const certos = itens.filter((i) => i.id && norm(i.info).includes(primeiro) && titulos.has(norm(semEdicao(i.titulo))));
  certos.sort((a, b) => (titulos.has(norm(b.titulo)) ? 1 : 0) - (titulos.has(norm(a.titulo)) ? 1 : 0));
  if (!certos.length) return null;
  const album = await yt("browse", { browseId: certos[0].id });
  const url = album?.microformat?.microformatDataRenderer?.urlCanonical;
  return /playlist\?list=OLAK5uy_/.test(url || "") ? url : null;
}

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ_FICHAS, "utf8"));
  // Título como está no chart (às vezes difere do MusicBrainz, ex.: subtítulos).
  const tituloChart = new Map();
  for (const f of fs.readdirSync(PASTA_CHARTS).filter((a) => a.endsWith(".json"))) {
    for (const a of JSON.parse(fs.readFileSync(path.join(PASTA_CHARTS, f), "utf8")).albuns) if (a.album) tituloChart.set(a.album, a.titulo);
  }
  const salvar = () => fs.writeFileSync(ARQ_FICHAS, JSON.stringify(fichas, null, 2) + "\n");
  const hoje = new Date().toISOString().slice(0, 10);
  const removidos = {};
  let feitos = 0;

  for (const f of fichas) {
    if (feitos >= limite) break;
    if (f.linksVerificados && !refazer.has(f.id)) continue;
    const links = { ...(f.links || {}) };
    // Link antigo do MusicBrainz para o YouTube: substituído pela busca abaixo.
    delete links.youtube;
    let incerto = false;
    for (const [servico, conferir] of Object.entries(CONFERIR)) {
      if (!links[servico]) continue;
      const ok = await conferir(links[servico]);
      if (ok === false) { (removidos[servico] ||= []).push(f.id); delete links[servico]; }
      if (ok === null) incerto = true;
    }
    if (f.titulo && f.artista) {
      const yt = await youtubeMusic(f, tituloChart.get(f.id));
      if (yt) links.youtubeMusic = yt;
      else if (f.links?.youtube) links.youtubeMusic = f.links.youtube.replace("www.youtube.com", "music.youtube.com");
    }
    f.links = links;
    if (!incerto) f.linksVerificados = hoje;
    feitos++;
    console.log(`${f.id}: ${Object.keys(links).join(", ") || "(nenhum)"}${incerto ? "  [algum serviço não respondeu]" : ""}`);
    if (feitos % 10 === 0) salvar();
  }
  salvar();

  const n = (k) => fichas.filter((f) => f.links?.[k]).length;
  console.log(`\n${feitos} fichas verificadas.`);
  console.log("removidos: " + (Object.entries(removidos).map(([k, v]) => `${k} ${v.length}`).join(", ") || "nenhum"));
  console.log(`com link — youtubeMusic ${n("youtubeMusic")}, spotify ${n("spotify")}, qobuz ${n("qobuz")}, appleMusic ${n("appleMusic")}, deezer ${n("deezer")}, tidal ${n("tidal")}, bandcamp ${n("bandcamp")}`);
  console.log(`sem nenhum link: ${fichas.filter((f) => !Object.keys(f.links || {}).length).length}`);
})();
