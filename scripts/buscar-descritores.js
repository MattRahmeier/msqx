// Descritores dos álbuns (data/albuns/albuns.json → "descritores"): o vocabulário é o de
// data/descritores/descritores.json (termos no estilo dos descriptors do RYM, só a lista de
// palavras; nada é copiado do RYM). Os descritores vêm das tags que as pessoas dão ao disco,
// somando as fontes:
//   - MusicBrainz: tags do release-group;
//   - Last.fm: tags do álbum, da faixa destaque e de mais duas faixas, e as do artista (exige
//     LASTFM_API_KEY, lida do ambiente ou, no Windows, da variável de usuário — a chave nunca é
//     gravada em arquivo).
// Uma tag vira descritor quando é o próprio termo ou um dos "sinonimos" (comparação sem acento,
// caixa ou pontuação). Tags de gênero não contam (ex.: "depressive black metal" ≠ "depressive").
// A meta é ter pelo menos 5 descritores por disco, em camadas:
//   1. fortes: MusicBrainz com 2+ votos e Last.fm (álbum ou faixa) com peso ≥ 10 — entram todas;
//   2. se faltar para 5: as demais tags do disco e das faixas, da mais forte para a mais fraca;
//   3. se faltar: descritor dentro de uma tag maior ("depressive black metal" → depressive);
//   4. se ainda faltar: as tags do artista no Last.fm (peso ≥ 10), inteiras e depois por dentro.
// As tags brutas ficam em fontes/descritores-tags.json (fora do git), para recalcular a escolha
// sem baixar de novo (--so-escolher).
// As fontes andam ao mesmo tempo, cada uma no ritmo que aceita: o Last.fm com vários pedidos em
// paralelo e o MusicBrainz em fila, 1 por segundo.
// Uso: node scripts/buscar-descritores.js [--ids id1,id2] [--refazer] [--sem-musicbrainz] [--so-escolher]
//   sem --refazer, só baixa o que ainda não está no cache.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RAIZ = path.join(__dirname, "..");
const ARQ = path.join(RAIZ, "data", "albuns", "albuns.json");
const CACHE = path.join(RAIZ, "fontes", "descritores-tags.json");
const VOCAB = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "descritores", "descritores.json"), "utf8"));
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const ids = arg("--ids") ? new Set(arg("--ids").split(",")) : null;
const refazer = process.argv.includes("--refazer");
const soEscolher = process.argv.includes("--so-escolher");
const semMb = process.argv.includes("--sem-musicbrainz");
const META = 5;
const LASTFM_PARALELO = 4;

let chave = process.env.LASTFM_API_KEY;
if (!chave && process.platform === "win32") {
  try { chave = execSync('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'LASTFM_API_KEY\',\'User\')"').toString().trim(); } catch { /* sem chave */ }
}
const UA = { "User-Agent": "Tracklore/0.1 (https://github.com/MattRahmeier/tracklore)" };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const porTag = new Map();
for (const d of VOCAB) for (const t of [d.id, d.nome, ...d.sinonimos]) porTag.set(norm(t), d.id);
// Descritor dentro de uma tag maior ("depressive black metal" → depressive, "dark ambient" →
// dark). Ficam de fora as palavras que, dentro de um nome de gênero, não dizem o que o descritor
// diz: heavy metal não é "pesado" por si, death metal não fala necessariamente de morte etc.
const NAO_DENTRO = new Set(["heavy", "death", "war", "live", "love", "party", "fall", "spring", "forest", "beach", "city", "street", "streets", "faith", "religion", "drug", "sad"].map(norm));
function dentroDe(tag) {
  const p = norm(tag).split(" ");
  const achados = [];
  for (let n = 3; n >= 1; n--) for (let i = 0; i + n <= p.length; i++) {
    const trecho = p.slice(i, i + n).join(" ");
    if (n === p.length || (n === 1 && NAO_DENTRO.has(trecho))) continue;
    const d = porTag.get(trecho);
    if (d) achados.push(d);
  }
  return achados;
}

async function json(url) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
      if (r.status === 404) return null;
      if (r.ok) return await r.json();
    } catch { /* de novo */ }
    await dorme(3000 * (t + 1));
  }
  return null;
}

// Tags brutas: [{ nome, peso }]. MusicBrainz: peso = votos. Last.fm: peso de 0 a 100.
async function doMusicBrainz(f) {
  if (!f.musicbrainz?.releaseGroup) return [];
  const r = await json(`https://musicbrainz.org/ws/2/release-group/${f.musicbrainz.releaseGroup}?inc=tags&fmt=json`);
  await dorme(1100);
  return r ? (r.tags || []).map((t) => ({ nome: t.name, peso: t.count })) : null;
}

const artistaPrincipal = (f) => f.artista.split(/,| & | \/ /)[0].trim();
async function lastfm(params) {
  const r = await json(`https://ws.audioscrobbler.com/2.0/?${new URLSearchParams({ ...params, autocorrect: "1", api_key: chave, format: "json" })}`);
  await dorme(200);
  if (!r || r.error) return [];
  return (r.toptags?.tag || []).map((t) => ({ nome: t.name, peso: Number(t.count) || 0 }));
}
async function doLastfm(f) {
  const artist = artistaPrincipal(f);
  const faixas = [...new Set([f.destaque?.titulo, ...(f.faixas || []).map((x) => x.titulo)].filter(Boolean))].slice(0, 3);
  const album = await lastfm({ method: "album.gettoptags", artist, album: f.titulo });
  const trilhas = [];
  for (const track of faixas) trilhas.push(...await lastfm({ method: "track.gettoptags", artist, track }));
  return { album, faixas: trilhas };
}
const artistas = new Map();
async function doArtista(nome) {
  if (!artistas.has(nome)) artistas.set(nome, lastfm({ method: "artist.gettoptags", artist: nome }));
  return artistas.get(nome);
}

// Escolha dos descritores a partir das tags brutas do disco (camadas descritas no topo).
function escolher(t) {
  const pontos = (lista, forte, dentro = false) => {
    const m = new Map();
    for (const { nome, peso } of lista || []) {
      if (!forte(peso)) continue;
      for (const d of dentro ? dentroDe(nome) : [porTag.get(norm(nome))].filter(Boolean)) m.set(d, Math.max(m.get(d) || 0, peso));
    }
    return m;
  };
  const somar = (...mapas) => {
    const total = new Map();
    for (const [m, escala] of mapas) for (const [d, p] of m) total.set(d, (total.get(d) || 0) + p * escala);
    return [...total].sort((a, b) => b[1] - a[1]).map(([d]) => d);
  };
  const mb = t.musicbrainz || [], lf = t.lastfm || { album: [], faixas: [] };
  const fortes = somar([pontos(mb, (p) => p >= 2), 10], [pontos(lf.album, (p) => p >= 10), 1], [pontos(lf.faixas, (p) => p >= 10), 1]);
  const escolhidos = [...fortes];
  const completar = (lista) => { for (const d of lista) { if (escolhidos.length >= META) break; if (!escolhidos.includes(d)) escolhidos.push(d); } };
  const todas = () => true;
  if (escolhidos.length < META) completar(somar([pontos(mb, todas), 10], [pontos(lf.album, todas), 1], [pontos(lf.faixas, todas), 1]));
  if (escolhidos.length < META) completar(somar([pontos(mb, todas, true), 10], [pontos(lf.album, (p) => p >= 2, true), 1], [pontos(lf.faixas, (p) => p >= 2, true), 1]));
  if (escolhidos.length < META) completar(somar([pontos(t.artista, (p) => p >= 10), 1]));
  if (escolhidos.length < META) completar(somar([pontos(t.artista, (p) => p >= 10, true), 1]));
  return escolhidos;
}

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
  const alvo = fichas.filter((f) => !ids || ids.has(f.id));
  const salvarCache = () => { fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, JSON.stringify(cache)); };

  if (!soEscolher) {
    const fontes = [
      ...(chave ? [["lastfm", doLastfm, LASTFM_PARALELO], ["artista", (f) => doArtista(artistaPrincipal(f)), LASTFM_PARALELO]] : []),
      ...(semMb ? [] : [["musicbrainz", doMusicBrainz, 1]]),
    ];
    console.log(`${alvo.length} fichas · fontes: ${fontes.map(([x]) => x).join(", ")}${chave ? "" : " (sem LASTFM_API_KEY: Last.fm fica de fora)"}`);
    let respostas = 0;
    await Promise.all(fontes.map(([nome, buscar, paralelo]) => {
      const fila = alvo.filter((f) => refazer || !cache[f.id]?.[nome]);
      console.log(`  ${nome}: ${fila.length} a baixar`);
      const trabalhador = async () => {
        for (let f; (f = fila.shift());) {
          const tags = await buscar(f);
          if (tags) (cache[f.id] ||= {})[nome] = tags;
          if (++respostas % 200 === 0) { salvarCache(); console.log(`… ${respostas} respostas`); }
        }
      };
      return Promise.all(Array.from({ length: paralelo }, trabalhador)).then(() => console.log(`— ${nome} terminou`));
    }));
    salvarCache();
  }

  for (const f of alvo) {
    const t = cache[f.id];
    if (!t) continue;
    const ds = escolher(t);
    if (ds.length) f.descritores = ds; else delete f.descritores;
    f.descritoresFonte = Object.keys(t).map((x) => (x === "artista" ? "lastfm" : x)).filter((x, i, a) => a.indexOf(x) === i);
  }
  fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  const n = (k) => fichas.filter((f) => (f.descritores?.length || 0) >= k).length;
  console.log(`\ncom descritores: ${n(1)} · com 5 ou mais: ${n(META)} · de ${fichas.length} fichas`);
})();
