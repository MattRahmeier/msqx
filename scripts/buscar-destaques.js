// Escolhe a "faixa destaque" de cada ficha (data/albuns/albuns.json): a faixa mais popular do
// álbum pela média das plataformas com dados públicos de popularidade:
//   Deezer ("rank"), YouTube Music (reproduções) e ListenBrainz (audições reunidas de vários
//   serviços de streaming, pelas gravações do MusicBrainz).
//   Em cada plataforma a faixa recebe uma nota de 0 a 1 = valor dela ÷ maior valor do álbum ali.
//   A nota final é a média das plataformas em que o álbum foi encontrado (faixa ausente numa delas
//   conta 0 nela).
//   destaque: { titulo, duracao, links: { youtubeMusic, deezer }, criterio, plataformas }
// Ficaram de fora: Spotify (a API exige Premium), Apple Music, Tidal e Qobuz (sem dados públicos
// de popularidade por faixa).
// Links da faixa: YouTube Music e Deezer vêm da média; Spotify (página do álbum + oEmbed), Apple
// Music (iTunes Lookup) e Qobuz (página do álbum) são procurados pelo título nos álbuns da ficha.
// Tidal e Bandcamp não têm dados públicos das faixas.
// Uso: node scripts/buscar-destaques.js [--refazer id1,id2 | --todos | --links]
//   --links: só procura os links da faixa nos outros serviços, sem refazer a escolha.

const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "data", "albuns", "albuns.json");
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const arg = (nome) => { const i = process.argv.indexOf(nome); return i > -1 ? process.argv[i + 1] : null; };
const refazer = new Set((arg("--refazer") || "").split(",").filter(Boolean));
const todos = process.argv.includes("--todos");
const soLinks = process.argv.includes("--links");

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/&/g, "and").replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, "");
// Sem sufixos de edição ou participações: "Dare (Remastered 2012)", "Song - 2009 Remaster", "X (feat. Y)".
const semEdicao = (s) => (s || "").replace(/\s*[([][^)\]]*[)\]]/g, "").replace(/\s+-\s+.*$/, "").trim();
const chave = (titulo) => norm(semEdicao(titulo));
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const ultimo = {};
async function pedir(servico, url, opcoes = {}, intervalo = 300) {
  const espere = intervalo - (Date.now() - (ultimo[servico] || 0));
  if (espere > 0) await espera(espere);
  ultimo[servico] = Date.now();
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, opcoes);
      if (r.ok) return r.json();
      if ([400, 401, 403, 404].includes(r.status)) return null;
    } catch { /* tenta de novo */ }
    await espera(3000 * (t + 1));
  }
  return null;
}

// --- Deezer ---
async function deezer(f) {
  let id = f.links?.deezer?.match(/album\/(\d+)/)?.[1];
  if (!id) {
    const primeiro = norm(f.artista.split(/,|&| and | e |•/)[0]);
    const q = encodeURIComponent(`artist:"${f.artista}" album:"${semEdicao(f.titulo)}"`);
    const r = await pedir("deezer", `https://api.deezer.com/search/album?q=${q}&limit=10`);
    const cand = (r?.data || []).filter((a) => norm(a.artist?.name).includes(primeiro) || primeiro.includes(norm(a.artist?.name)));
    id = (cand.find((a) => chave(a.title) === chave(f.titulo)) || cand.find((a) => norm(a.title).startsWith(chave(f.titulo))))?.id;
  }
  if (!id) return null;
  const r = await pedir("deezer", `https://api.deezer.com/album/${id}/tracks?limit=200`);
  if (!r?.data?.length || r.error) return null;
  return r.data.map((t) => ({ titulo: t.title, valor: t.rank, duracao: t.duration, link: t.link }));
}

// --- YouTube Music ---
const YT_CTX = { client: { clientName: "WEB_REMIX", clientVersion: "1.20241023.01.00", hl: "en", gl: "BR" } };
const YT_H = { "Content-Type": "application/json", Origin: "https://music.youtube.com", Referer: "https://music.youtube.com/" };
const andar = (o, fn, saida = []) => {
  if (o && typeof o === "object") { if (fn(o)) saida.push(o); for (const v of Object.values(o)) andar(v, fn, saida); }
  return saida;
};
const yt = (browseId) => pedir("youtube", "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false",
  { method: "POST", headers: YT_H, body: JSON.stringify({ context: YT_CTX, browseId }) }, 1200);
// "217M plays" → 217000000
const reproducoes = (s) => { const m = s.match(/([\d.,]+)\s*([KMB]?)\s*plays?/i); if (!m) return null; return parseFloat(m[1].replace(/,/g, "")) * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()] || 1); };

async function youtube(f) {
  const lista = f.links?.youtubeMusic?.match(/list=([\w-]+)/)?.[1];
  if (!lista) return null;
  const playlist = await yt("VL" + lista);
  const album = andar(playlist, (o) => typeof o.browseId === "string" && o.browseId.startsWith("MPREb"))[0]?.browseId;
  const pagina = album && await yt(album);
  if (!pagina) return null;
  const faixas = andar(pagina, (o) => o.musicResponsiveListItemRenderer).map((o) => {
    const r = o.musicResponsiveListItemRenderer;
    const colunas = (r.flexColumns || []).map((c) => (c.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []).map((x) => x.text).join(""));
    const video = andar(r, (x) => typeof x.videoId === "string")[0]?.videoId;
    return { titulo: colunas[0], valor: reproducoes(colunas.slice(1).join(" ")), link: video ? `https://music.youtube.com/watch?v=${video}&list=${lista}` : null };
  }).filter((t) => t.titulo && t.valor != null);
  return faixas.length ? faixas : null;
}

// --- ListenBrainz ---
async function listenbrainz(f) {
  const release = f.musicbrainz?.release;
  if (!release) return null;
  const r = await pedir("musicbrainz", `https://musicbrainz.org/ws/2/release/${release}?fmt=json&inc=recordings`,
    { headers: { "User-Agent": "Tracklore/0.1 (https://github.com/MattRahmeier/tracklore)" } }, 1100);
  const gravacoes = (r?.media || []).flatMap((m) => (m.tracks || []).map((t) => ({ id: t.recording?.id, titulo: t.title }))).filter((g) => g.id);
  if (!gravacoes.length) return null;
  const p = await pedir("listenbrainz", "https://api.listenbrainz.org/1/popularity/recording",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recording_mbids: gravacoes.map((g) => g.id) }) }, 500);
  const porId = new Map((p || []).map((x) => [x.recording_mbid, x.total_listen_count || 0]));
  return gravacoes.map((g) => ({ titulo: g.titulo, valor: porId.get(g.id) || 0 }));
}

const PLATAFORMAS = { youtubeMusic: youtube, deezer, listenbrainz };

// --- links da faixa nos outros serviços ---
const UA_WEB = { "User-Agent": "Mozilla/5.0 (Tracklore; https://github.com/MattRahmeier/tracklore)" };
const texto = async (servico, url) => {
  const espere = 500 - (Date.now() - (ultimo[servico] || 0));
  if (espere > 0) await espera(espere);
  ultimo[servico] = Date.now();
  try { const r = await fetch(url, { headers: UA_WEB }); return r.ok ? { html: await r.text(), url: r.url } : null; } catch { return null; }
};
const desescapar = (s) => s.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&");

// Spotify: as faixas estão nas meta tags "music:song" da página do álbum; o título vem do oEmbed.
async function spotifyFaixa(f, alvo) {
  const pagina = f.links?.spotify && await texto("spotify", f.links.spotify);
  const faixas = [...(pagina?.html || "").matchAll(/name="music:song" content="([^"]+)"/g)].map((m) => m[1]);
  for (const url of faixas.slice(0, 60)) {
    const o = await pedir("spotify", `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, {}, 300);
    if (o?.title && chave(o.title) === alvo) return url;
  }
  return null;
}

// Apple Music: a API pública iTunes Lookup lista as faixas do álbum (o id antigo redireciona para o atual).
async function appleFaixa(f, alvo) {
  if (!f.links?.appleMusic) return null;
  const pagina = await texto("apple", f.links.appleMusic);
  const id = (pagina?.url || f.links.appleMusic).match(/(?:\/|id)(\d{6,})(?:\?|$)/)?.[1];
  const r = id && await pedir("apple", `https://itunes.apple.com/lookup?id=${id}&entity=song&country=br`, {}, 500);
  const t = (r?.results || []).find((x) => x.wrapperType === "track" && chave(x.trackName) === alvo);
  return t?.trackViewUrl?.replace(/&uo=\d+$/, "") || null;
}

// Qobuz: cada faixa da página do álbum tem data-track="<id>" seguido do título.
async function qobuzFaixa(f, alvo) {
  const pagina = f.links?.qobuz && await texto("qobuz", f.links.qobuz.replace(/^http:/, "https:"));
  for (const pedaco of (pagina?.html || "").split('data-track="').slice(1)) {
    const id = pedaco.match(/^(\d+)/)?.[1];
    const titulo = pedaco.match(/title="([^"]+)"/)?.[1];
    if (id && titulo && chave(desescapar(titulo)) === alvo) return `https://open.qobuz.com/track/${id}`;
  }
  return null;
}

async function linksDaFaixa(f) {
  const alvo = chave(f.destaque.titulo);
  for (const [nome, buscar] of [["spotify", spotifyFaixa], ["appleMusic", appleFaixa], ["qobuz", qobuzFaixa]]) {
    if (f.destaque.links?.[nome]) continue;
    const link = await buscar(f, alvo);
    if (link) (f.destaque.links ||= {})[nome] = link;
  }
}

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const salvar = () => fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  const hoje = new Date().toISOString().slice(0, 10);
  let feitos = 0;
  for (const f of fichas) {
    if (soLinks) {
      if (!f.destaque) continue;
      await linksDaFaixa(f);
      feitos++;
      console.log(`${f.id}: ${Object.keys(f.destaque.links || {}).join(", ")}`);
      if (feitos % 20 === 0) salvar();
      continue;
    }
    if (!todos && f.destaqueVerificado && !refazer.has(f.id)) continue;
    if (!f.titulo || !f.artista) continue;
    delete f.destaque;

    // Faixas do álbum: as da ficha (MusicBrainz); sem elas, as que as plataformas trouxerem.
    const notas = new Map(); // chave → { titulo, duracao, links, pontos: { plataforma: 0..1 } }
    for (const t of f.faixas || []) notas.set(chave(t.titulo), { titulo: semEdicao(t.titulo) || t.titulo, duracao: t.duracao, links: {}, pontos: {} });
    const usadas = [];
    for (const [nome, buscar] of Object.entries(PLATAFORMAS)) {
      const faixas = await buscar(f);
      if (!faixas?.length) continue;
      const maior = Math.max(...faixas.map((t) => t.valor || 0));
      if (!maior) continue;
      usadas.push(nome);
      for (const t of faixas) {
        const k = chave(t.titulo);
        if (!notas.has(k)) { if (f.faixas?.length) continue; notas.set(k, { titulo: semEdicao(t.titulo) || t.titulo, links: {}, pontos: {} }); }
        const n = notas.get(k);
        n.pontos[nome] = Math.max(n.pontos[nome] || 0, (t.valor || 0) / maior);
        if (t.link && !n.links[nome]) n.links[nome] = t.link;
        // Duração da versão que os links tocam (a da ficha pode ser de outra mixagem).
        if (!n.duracaoPlataforma && t.duracao) n.duracaoPlataforma = mmss(t.duracao);
      }
    }
    const media = (n) => usadas.reduce((s, p) => s + (n.pontos[p] || 0), 0) / usadas.length;
    const top = usadas.length ? [...notas.values()].sort((a, b) => media(b) - media(a))[0] : null;
    if (top && media(top) > 0) {
      f.destaque = {
        titulo: top.titulo,
        duracao: top.duracaoPlataforma || top.duracao || null,
        links: top.links,
        criterio: "A faixa mais popular do álbum nos streamings.",
        plataformas: usadas,
      };
    }
    if (f.destaque) await linksDaFaixa(f);
    f.destaqueVerificado = hoje;
    feitos++;
    console.log(`${f.destaque ? "✓" : "–"} ${f.id}${f.destaque ? `: ${f.destaque.titulo} [${usadas.join(", ")}]` : ""}`);
    if (feitos % 20 === 0) salvar();
  }
  salvar();
  console.log(`\n${feitos} fichas · com destaque: ${fichas.filter((f) => f.destaque).length}`);
})();
