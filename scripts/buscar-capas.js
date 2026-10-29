// Capas para as fichas que ainda não têm (data/albuns/albuns.json), em outras fontes além da capa do
// release-group no Cover Art Archive (criar-fichas.js) e do Deezer/iTunes (completar-links.js):
//   1. Cover Art Archive de qualquer edição do release-group no MusicBrainz;
//   2. Discogs: a imagem principal do registro ligado na ficha ou, sem link, do resultado da busca por
//      artista + título (exige DISCOGS_TOKEN, como completar-discogs.js);
//   3. Wikipédia: a imagem principal do artigo de onde veio o "sobre".
// Grava a imagem em assets/img/capas/<id>.jpg, "capaFonte" com o endereço e "complementos.capa" com a fonte.
// Uso: node scripts/buscar-capas.js [--ids id1,id2]
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RAIZ = path.join(__dirname, "..");
const ARQ = path.join(RAIZ, "data", "albuns", "albuns.json");
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const ids = arg("--ids") ? new Set(arg("--ids").split(",")) : null;

let token = process.env.DISCOGS_TOKEN;
if (!token && process.platform === "win32") {
  try { token = execSync('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'DISCOGS_TOKEN\',\'User\')"').toString().trim(); } catch { /* sem token */ }
}
const UA = { "User-Agent": "Tracklore/0.1 (https://github.com/MattRahmeier/tracklore)" };
const UA_DISCOGS = { ...UA, ...(token && { Authorization: `Discogs token=${token}` }) };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

async function json(url, headers = UA) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
      if (r.status === 404) return null;
      if (r.ok) return await r.json();
    } catch { /* tenta de novo */ }
    await dorme(2000);
  }
  return null;
}

// Cover Art Archive: a primeira edição do release-group que tem frente.
async function deEdicoes(f) {
  if (!f.musicbrainz?.releaseGroup) return null;
  const r = await json(`https://musicbrainz.org/ws/2/release?release-group=${f.musicbrainz.releaseGroup}&fmt=json&limit=100`);
  await dorme(1100);
  const edicao = (r?.releases || []).find((e) => e["cover-art-archive"]?.front);
  return edicao ? { url: `https://coverartarchive.org/release/${edicao.id}/front-500`, fonte: "coverartarchive" } : null;
}

async function deDiscogs(f) {
  if (!token) return null;
  let m = (f.discogs || "").match(/discogs\.com\/(master|release)\/(\d+)/);
  if (!m) {
    const q = new URLSearchParams({ artist: f.artista.split(/,| & /)[0], release_title: f.titulo, type: "master", per_page: "5" });
    const busca = await json(`https://api.discogs.com/database/search?${q}`, UA_DISCOGS);
    await dorme(1100);
    // Só aceita resultado com o mesmo título (o Discogs escreve "Artista - Título").
    const achado = (busca?.results || []).find((x) => norm(x.title).endsWith(norm(f.titulo)));
    if (!achado) return null;
    m = [null, "master", String(achado.id)];
  }
  const d = await json(`https://api.discogs.com/${m[1]}s/${m[2]}`, UA_DISCOGS);
  await dorme(1100);
  const img = (d?.images || []).find((i) => i.type === "primary") || d?.images?.[0];
  return img?.uri ? { url: img.uri, fonte: "discogs" } : null;
}

async function deWikipedia(f) {
  const m = (f.sobreFonte?.url || "").match(/^https:\/\/(\w+)\.wikipedia\.org\/wiki\/(.+)$/);
  if (!m) return null;
  const r = await json(`https://${m[1]}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original&redirects&format=json&titles=${m[2]}`);
  const p = r && Object.values(r.query?.pages || {})[0];
  return p?.original?.source ? { url: p.original.source, fonte: "wikipedia" } : null;
}

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const alvo = fichas.filter((f) => !f.capa && (!ids || ids.has(f.id)));
  console.log(`${alvo.length} fichas sem capa${token ? "" : " (sem DISCOGS_TOKEN: Discogs fica de fora)"}`);
  let achadas = 0;
  for (const f of alvo) {
    let capa = null;
    for (const fonte of [deEdicoes, deDiscogs, deWikipedia]) {
      const c = await fonte(f);
      if (!c) continue;
      try {
        const r = await fetch(c.url, { headers: c.fonte === "discogs" ? UA_DISCOGS : UA, signal: AbortSignal.timeout(30000) });
        if (r.ok && /^image\//.test(r.headers.get("content-type") || "")) { capa = { ...c, dados: Buffer.from(await r.arrayBuffer()) }; break; }
      } catch { /* próxima fonte */ }
    }
    if (capa) {
      f.capa = `assets/img/capas/${f.id}.jpg`;
      fs.writeFileSync(path.join(RAIZ, f.capa), capa.dados);
      f.capaFonte = capa.url;
      f.complementos = { ...(f.complementos || {}), capa: capa.fonte };
      if (f.conferir) { f.conferir = f.conferir.replace(/;?\s*sem capa no Cover Art Archive/, "").replace(/^;\s*/, ""); if (!f.conferir) delete f.conferir; }
      achadas++;
    }
    console.log(`${capa ? "✓" : "–"} ${f.id}${capa ? ` (${capa.fonte})` : ""}`);
  }
  fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  console.log(`\n${achadas} capas novas · ainda sem capa: ${fichas.filter((f) => !f.capa).length}`);
})();
