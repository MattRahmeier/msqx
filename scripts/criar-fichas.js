// Cria as fichas de álbum (data/albuns/albuns.json) a partir dos charts transcritos em data/charts/mu/.
// Fontes: MusicBrainz (metadados, faixas, links de streaming) e Cover Art Archive (capas).
// Uso: node scripts/criar-fichas.js [--limite N] [--refazer id1,id2] [--paralelo N (padrão 6)]
//   Fichas já criadas são mantidas (o script retoma de onde parou); --refazer força a busca de novo.
//   Também grava em cada álbum dos charts o campo "album" com o id da ficha.

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const PASTA_CHARTS = path.join(RAIZ, "data", "charts", "mu");
const ARQ_FICHAS = path.join(RAIZ, "data", "albuns", "albuns.json");
const PASTA_CAPAS = path.join(RAIZ, "assets", "img", "capas");
const MB = "https://musicbrainz.org/ws/2";
const UA = { "User-Agent": "MsqX/0.1 ( https://github.com/MattRahmeier/msqx )", Accept: "application/json" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const arg = (nome) => { const i = process.argv.indexOf(nome); return i > -1 ? process.argv[i + 1] : null; };
const limite = Number(arg("--limite")) || Infinity;
const paralelo = Number(arg("--paralelo")) || 6;
const refazer = new Set((arg("--refazer") || "").split(",").filter(Boolean));

const kebab = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/&/g, " and ").replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// Comparação tolerante: sem acento, caixa, pontuação, "the" inicial e "&"/"and".
const norm = (s) => kebab(s || "").replace(/^the-/, "").replace(/-and-/g, "-");

// Um pedido por segundo no máximo, contado pelo início de cada pedido: com várias fichas em paralelo
// (--paralelo), a demora das respostas não trava a fila.
let proximo = 0;
const vez = async () => { const t = Math.max(Date.now(), proximo); proximo = t + 1100; await espera(t - Date.now()); };
async function mb(caminho, params) {
  const url = `${MB}/${caminho}?` + new URLSearchParams({ fmt: "json", ...params });
  for (let t = 0; t < 4; t++) {
    await vez();
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (r.ok) return r.json();
      if (r.status === 404) return null;
    } catch { /* rede instável: tenta de novo */ }
    await espera(5000 * (t + 1));
  }
  throw new Error(`MusicBrainz não respondeu: ${caminho}`);
}

const esc = (s) => s.replace(/(["\\])/g, "\\$1");

// Busca livre: sem os caracteres especiais do Lucene.
const livre = (s) => s.replace(/[-+&|!(){}[\]^"~*?:\\/]/g, " ");

// Melhor release-group para artista + título. A busca por campo exato falha quando a grafia
// difere (ex.: "Run-DMC" × "Run‐D.M.C.", "Getz/Gilberto"), então tenta buscas mais soltas
// e compara os resultados aqui.
async function buscarGrupo(artista, titulo) {
  const primeiro = norm(artista.split(/,|&| and | e |•/)[0]);
  const avaliar = (g) => {
    const credito = (g["artist-credit"] || []).map((a) => a.name + (a.joinphrase || "")).join("");
    const tituloOk = norm(g.title) === norm(titulo);
    const artistaOk = norm(credito) === norm(artista) || norm(credito).includes(primeiro) || norm(artista).includes(norm(credito));
    return { credito, tituloOk, artistaOk };
  };
  const consultas = [
    { query: `releasegroup:"${esc(titulo)}" AND artist:"${esc(artista)}"`, limit: "10" },
    { query: livre(`${titulo} ${artista}`), limit: "25" },
    { query: `releasegroup:"${esc(titulo)}"`, limit: "50" },
  ];
  const vistos = new Map();
  for (const params of consultas) {
    const r = await mb("release-group", params);
    for (const g of r?.["release-groups"] || []) if (!vistos.has(g.id)) vistos.set(g.id, g);
    if ([...vistos.values()].some((g) => { const a = avaliar(g); return a.tituloOk && a.artistaOk; })) break;
  }
  const candidatos = [...vistos.values()].map((g) => {
    const { credito, tituloOk, artistaOk } = avaliar(g);
    // Preferência: artista certo acima de tudo, depois título exato (ou o do chart seguido de subtítulo),
    // depois álbum original — não coletânea/ao vivo com o mesmo nome (ex.: uma caixa "Blue Train" de
    // 2008) — e com mais edições (o original costuma ter dezenas), depois o score da busca.
    const prefixo = !tituloOk && norm(g.title).startsWith(norm(titulo) + "-");
    const secundario = (g["secondary-types"] || []).length > 0;
    const pontos = (artistaOk ? 200 : 0) + (tituloOk ? 100 : prefixo ? 40 : 0) + (g["primary-type"] === "Album" ? 10 : 0)
      + (secundario ? 0 : 15) + Math.min(g.count || 0, 50) / 2 + g.score / 10;
    return { g, credito, tituloOk, artistaOk, pontos };
  });
  candidatos.sort((a, b) => b.pontos - a.pontos);
  return candidatos[0] || null;
}

const PLATAFORMAS = [
  ["spotify", /open\.spotify\.com\/album\//],
  ["youtube", /(music\.)?youtube\.com\/(playlist|browse|channel)/],
  ["qobuz", /qobuz\.com/],
  ["bandcamp", /bandcamp\.com\/album\//],
  ["appleMusic", /music\.apple\.com|itunes\.apple\.com/],
  ["deezer", /deezer\.com\/(\w+\/)?album\//],
  ["tidal", /tidal\.com\/(browse\/)?album\//],
];

function links(relacoes) {
  const saida = {};
  for (const rel of relacoes || []) {
    const u = rel.url?.resource;
    if (!u) continue;
    for (const [nome, re] of PLATAFORMAS) if (!saida[nome] && re.test(u)) saida[nome] = u;
  }
  return saida;
}

const mmss = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

// Capa do release-group; se ele não tiver, a de alguma versão com frente no Cover Art Archive.
async function baixarCapa(grupoId, versoes, id) {
  const destino = path.join(PASTA_CAPAS, `${id}.jpg`);
  if (fs.existsSync(destino)) return `assets/img/capas/${id}.jpg`;
  const fontes = [`release-group/${grupoId}`, ...versoes.filter((v) => v["cover-art-archive"]?.front).map((v) => `release/${v.id}`)];
  for (const f of fontes.slice(0, 4)) {
    try {
      const r = await fetch(`https://coverartarchive.org/${f}/front-500`, { headers: UA });
      if (!r.ok) continue;
      fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
      return `assets/img/capas/${id}.jpg`;
    } catch { /* tenta a próxima */ }
  }
  return null;
}

// Correções manuais (data/albuns/correcoes.json): { "<id da ficha>": "<MBID do release-group>" }.
// null = o álbum não está no MusicBrainz (a ficha fica só com o que veio do chart).
// Objeto { "releaseGroup": "<MBID>", "titulo": "...", "artista": "...", "lancamento": "...", "gravadora": "...",
// "fonte": "<url>" } quando o MusicBrainz não tem o dado usual (ex.: título original em alemão, só a
// reedição); esses campos substituem os do MusicBrainz e "fonte" registra de onde vieram.
const ARQ_CORRECOES = path.join(RAIZ, "data", "albuns", "correcoes.json");
const correcoes = fs.existsSync(ARQ_CORRECOES) ? JSON.parse(fs.readFileSync(ARQ_CORRECOES, "utf8")) : {};

async function grupoCorrigido(mbid) {
  const g = await mb(`release-group/${mbid}`, { inc: "artist-credits" });
  if (!g) throw new Error(`release-group ${mbid} não existe`);
  const credito = (g["artist-credit"] || []).map((a) => a.name + (a.joinphrase || "")).join("");
  return { g, credito, tituloOk: true, artistaOk: true };
}

// Gravadora principal: entre as gravadoras das edições oficiais do primeiro ano de lançamento, a que
// mais aparece no total das edições oficiais (sem "[no label]"). Assim fica o selo original
// (ex.: Blue Note, não um selo de reedição) e não a distribuidora de uma prensagem regional.
function gravadoraDe(versoes) {
  const oficiais = versoes.filter((v) => v.status === "Official");
  const nomes = (v) => [...new Set((v["label-info"] || []).map((l) => l.label?.name).filter((n) => n && !/^\[no label\]$/i.test(n)))];
  const total = new Map();
  for (const v of oficiais) for (const n of nomes(v)) total.set(n, (total.get(n) || 0) + 1);
  const anos = oficiais.map((v) => v.date?.slice(0, 4)).filter(Boolean).sort();
  const primeiras = anos.length ? oficiais.filter((v) => v.date?.startsWith(anos[0])) : oficiais;
  const candidatas = [...new Set(primeiras.flatMap(nomes))];
  return candidatas.sort((a, b) => total.get(b) - total.get(a))[0] || null;
}

async function criarFicha(id, artista, titulo) {
  if (correcoes[id] === null) return { id, titulo, artista, conferir: "não está no MusicBrainz (correcoes.json)" };
  const correcao = typeof correcoes[id] === "string" ? { releaseGroup: correcoes[id] } : correcoes[id];
  const achado = correcao?.releaseGroup ? await grupoCorrigido(correcao.releaseGroup) : await buscarGrupo(artista, titulo);
  // Crédito só em escrita não latina (ex.: "坂本龍一"): fica o nome como está no chart.
  if (achado && !/[a-z]/i.test(achado.credito)) achado.credito = artista;
  if (!achado) return { id, titulo, artista, conferir: "não encontrado no MusicBrainz" };
  const { g } = achado;

  // Todas as versões do álbum com seus links (os de streaming costumam estar nas edições digitais).
  const grupo = await mb(`release-group/${g.id}`, { inc: "url-rels" });
  const versoes = (await mb("release", { "release-group": g.id, inc: "url-rels labels", limit: "100" }))?.releases || [];
  // Faixas do release representativo: o oficial mais antigo.
  const oficiais = versoes.filter((r) => r.status === "Official").sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const escolhido = oficiais[0] || versoes[0];
  const release = escolhido ? await mb(`release/${escolhido.id}`, { inc: "recordings" }) : null;

  const faixas = [];
  let totalMs = 0;
  for (const meio of release?.media || []) {
    for (const t of meio.tracks || []) {
      faixas.push({ n: faixas.length + 1, titulo: t.title, duracao: t.length ? mmss(t.length) : null });
      totalMs += t.length || 0;
    }
  }

  const ficha = {
    id,
    titulo: /[a-z]/i.test(g.title) ? g.title : titulo,
    artista: achado.credito,
    lancamento: g["first-release-date"] || null,
    tipo: [g["primary-type"], ...(g["secondary-types"] || [])].filter(Boolean).join(" / ") || null,
    gravadora: gravadoraDe(versoes),
    duracao: totalMs ? mmss(totalMs) : null,
    faixas,
    links: { ...links(versoes.flatMap((v) => v.relations || [])), ...links(grupo?.relations) },
    capa: await baixarCapa(g.id, versoes, id),
    musicbrainz: { releaseGroup: g.id, release: escolhido?.id || null },
  };
  if (!achado.tituloOk || !achado.artistaOk) {
    ficha.conferir = `MusicBrainz retornou "${achado.credito} — ${g.title}" para "${artista} — ${titulo}"`;
  }
  if (!ficha.capa) ficha.conferir = [ficha.conferir, "sem capa no Cover Art Archive"].filter(Boolean).join("; ");
  if (correcao?.titulo) ficha.titulo = correcao.titulo;
  if (correcao?.lancamento) ficha.lancamento = correcao.lancamento;
  if (correcao?.gravadora) ficha.gravadora = correcao.gravadora;
  if (correcao?.artista) ficha.artista = correcao.artista;
  return ficha;
}

(async () => {
  fs.mkdirSync(PASTA_CAPAS, { recursive: true });
  fs.mkdirSync(path.dirname(ARQ_FICHAS), { recursive: true });
  const fichas = new Map(fs.existsSync(ARQ_FICHAS) ? JSON.parse(fs.readFileSync(ARQ_FICHAS, "utf8")).map((f) => [f.id, f]) : []);
  const salvar = () => fs.writeFileSync(ARQ_FICHAS, JSON.stringify([...fichas.values()].sort((a, b) => a.id.localeCompare(b.id)), null, 2) + "\n");

  // Álbuns únicos de todos os charts (artista + título), com os charts e gêneros onde aparecem.
  const charts = fs.readdirSync(PASTA_CHARTS).filter((f) => f.endsWith(".json")).sort()
    .map((f) => ({ arquivo: path.join(PASTA_CHARTS, f), dados: JSON.parse(fs.readFileSync(path.join(PASTA_CHARTS, f), "utf8")) }));
  const pedidos = new Map();
  for (const { dados } of charts) {
    for (const a of dados.albuns) {
      if (!a.titulo) continue;
      const id = a.album || kebab(`${a.artista} ${a.titulo}`);
      a.album = id;
      const p = pedidos.get(id) || { id, artista: a.artista, titulo: a.titulo, charts: new Set(), generos: new Set() };
      p.charts.add(dados.id);
      // Charts com listas por gênero (ex.: metal-subgenres) dão "generos" em cada álbum.
      (a.generos || dados.generos).forEach((x) => p.generos.add(x));
      if (a.essencial) p.essencial = true;
      pedidos.set(id, p);
    }
  }
  // Discos das edições de A Curadoria (data/curadorias/) que não estão em nenhum chart.
  const PASTA_CURADORIAS = path.join(RAIZ, "data", "curadorias");
  for (const arq of fs.readdirSync(PASTA_CURADORIAS).filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "indice.json")) {
    const edicao = JSON.parse(fs.readFileSync(path.join(PASTA_CURADORIAS, arq), "utf8"));
    // Os discos das faixas e os citados no texto ("citados": [{ artista, titulo, album }]).
    const discos = [...(edicao.faixas || []).map((t) => ({ album: t.album, artista: t.artista, titulo: t.albumTitulo })), ...(edicao.citados || [])];
    for (const t of discos) {
      if (t.album && !pedidos.has(t.album)) pedidos.set(t.album, { id: t.album, artista: t.artista, titulo: t.titulo, charts: new Set(), generos: new Set() });
    }
  }

  let feitos = 0;
  const fila = [...pedidos.values()].filter((p) => !fichas.has(p.id) || refazer.has(p.id)).slice(0, limite);
  const trabalhador = async () => {
    for (let p; (p = fila.shift());) {
      try {
        const f = await criarFicha(p.id, p.artista, p.titulo);
        fichas.set(p.id, f);
        feitos++;
        console.log(`${f.conferir ? "?" : "✓"} ${p.id}${f.conferir ? `  (${f.conferir})` : ""}`);
        if (feitos % 10 === 0) salvar();
      } catch (e) {
        console.log(`✗ ${p.id}: ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: paralelo }, trabalhador));

  // Charts e gêneros de cada ficha (recalculados sempre, a partir dos charts).
  for (const p of pedidos.values()) {
    const f = fichas.get(p.id);
    if (f) { f.charts = [...p.charts]; f.generos = [...p.generos]; if (p.essencial) f.essencial = true; else delete f.essencial; }
  }
  salvar();
  for (const { arquivo, dados } of charts) fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2) + "\n");

  const todas = [...fichas.values()];
  const comLink = (k) => todas.filter((f) => f.links?.[k]).length;
  console.log(`\n${todas.length}/${pedidos.size} fichas · capa: ${todas.filter((f) => f.capa).length} · faixas: ${todas.filter((f) => f.faixas?.length).length}`);
  console.log(`links diretos — spotify ${comLink("spotify")}, youtube ${comLink("youtube")}, qobuz ${comLink("qobuz")}, bandcamp ${comLink("bandcamp")}, apple ${comLink("appleMusic")}, deezer ${comLink("deezer")}, tidal ${comLink("tidal")}`);
  console.log(`a conferir: ${todas.filter((f) => f.conferir).length}`);
})();
