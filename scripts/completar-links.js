// Procura links de álbum que faltam nas fichas (data/albuns/albuns.json) e capas ausentes, por
// busca nas APIs públicas do Deezer e do iTunes (Apple Music), aceitando só resultados com o
// mesmo título e o mesmo artista. Depois rode scripts/verificar-links.js --refazer <ids> (confere
// os links e procura o YouTube Music) e scripts/buscar-destaques.js --refazer <ids>.
// Uso: node scripts/completar-links.js        (imprime os ids alterados no fim)

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const ARQ = path.join(RAIZ, "data", "albuns", "albuns.json");
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, "");
const semEdicao = (s) => (s || "").replace(/\s*[([][^)\]]*[)\]]/g, "").replace(/\s+-\s+.*$/, "").trim();

const ultimo = {};
async function json(servico, url, intervalo = 400) {
  const espere = intervalo - (Date.now() - (ultimo[servico] || 0));
  if (espere > 0) await espera(espere);
  ultimo[servico] = Date.now();
  for (let t = 0; t < 3; t++) {
    try { const r = await fetch(url); if (r.ok) return r.json(); if (r.status === 404) return null; } catch { /* de novo */ }
    await espera(3000 * (t + 1));
  }
  return null;
}

const mesmoAlbum = (f, titulo, artista) => {
  const primeiro = norm(f.artista.split(/,|&| and | e |•/)[0]);
  const a = norm(artista);
  return norm(semEdicao(titulo)) === norm(semEdicao(f.titulo)) && (a.includes(primeiro) || primeiro.includes(a));
};

async function deezer(f) {
  const q = encodeURIComponent(`artist:"${f.artista.split(/,|&| and /)[0].trim()}" album:"${semEdicao(f.titulo)}"`);
  const r = await json("deezer", `https://api.deezer.com/search/album?q=${q}&limit=15`, 300);
  return (r?.data || []).find((a) => mesmoAlbum(f, a.title, a.artist?.name)) || null;
}

async function itunes(f) {
  const termo = encodeURIComponent(`${f.artista.split(/,|&| and /)[0].trim()} ${semEdicao(f.titulo)}`);
  const r = await json("itunes", `https://itunes.apple.com/search?entity=album&limit=25&country=br&term=${termo}`, 1500);
  return (r?.results || []).find((a) => mesmoAlbum(f, a.collectionName, a.artistName)) || null;
}

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const alterados = [];
  for (const f of fichas) {
    if (!f.titulo || !f.artista) continue;
    const temCapa = f.capa && fs.existsSync(path.join(RAIZ, f.capa));
    const faltaDeezer = !f.links?.deezer, faltaApple = !f.links?.appleMusic;
    if (temCapa && !faltaDeezer && !faltaApple) continue;
    const feito = [];
    const d = (faltaDeezer || !temCapa) ? await deezer(f) : null;
    const i = (faltaApple || (!temCapa && !d)) ? await itunes(f) : null;
    if (faltaDeezer && d?.link) { (f.links ||= {}).deezer = d.link; feito.push("deezer"); }
    if (faltaApple && i?.collectionViewUrl) { (f.links ||= {}).appleMusic = i.collectionViewUrl.replace(/\?uo=\d+$/, ""); feito.push("appleMusic"); }
    if (!temCapa) {
      const url = d?.cover_big || i?.artworkUrl100?.replace(/100x100bb/, "600x600bb");
      if (url) {
        const r = await fetch(url);
        if (r.ok) {
          f.capa = `assets/img/capas/${f.id}.jpg`;
          fs.writeFileSync(path.join(RAIZ, f.capa), Buffer.from(await r.arrayBuffer()));
          f.capaFonte = url;
          f.complementos = { ...(f.complementos || {}), capa: d?.cover_big ? "deezer" : "appleMusic" };
          if (f.conferir) { f.conferir = f.conferir.replace(/;?\s*sem capa no Cover Art Archive/, "").replace(/^;\s*/, ""); if (!f.conferir) delete f.conferir; }
          feito.push("capa");
        }
      }
    }
    if (feito.length) { alterados.push(f.id); delete f.linksVerificados; }
    console.log(`${feito.length ? "✓" : "–"} ${f.id}${feito.length ? `: ${feito.join(", ")}` : ""}`);
  }
  fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  console.log(`\n${alterados.length} fichas alteradas.\nIDS=${alterados.join(",")}`);
})();
