// Links das faixas de A Curadoria (data/curadorias/*.json): para cada faixa sem "links", procura a
// faixa no álbum da ficha — Deezer e YouTube Music pela lista de faixas do álbum; Spotify, Apple Music
// e Qobuz pelas páginas do álbum (mesmas funções de buscar-destaques.js). Sem YouTube Music no álbum,
// procura a faixa na busca de músicas do YouTube Music (o "Tocar aqui" do site embute esse vídeo).
// Uso: node scripts/curadoria-faixas.js [--refazer]   (--refazer: busca de novo as que já têm links)

const fs = require("fs");
const path = require("path");
const { linksDeFaixa } = require("./buscar-destaques.js");

const RAIZ = path.join(__dirname, "..");
const PASTA = path.join(RAIZ, "data", "curadorias");
const refazer = process.argv.includes("--refazer");

// Sem o álbum no YouTube Music, procura a faixa na busca de músicas (só o catálogo oficial, não
// vídeos de fãs): título igual (sem "(2019 Remastered)") e artista igual (a busca corta nomes longos).
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "");
const semEdicao = (s) => (s || "").replace(/\s*[([][^)\]]*[)\]]/g, "").trim();
const andar = (o, fn, s = []) => { if (o && typeof o === "object") { if (fn(o)) s.push(o); for (const v of Object.values(o)) andar(v, fn, s); } return s; };
async function youtubeMusicMusica(t) {
  try {
    const r = await fetch("https://music.youtube.com/youtubei/v1/search?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://music.youtube.com", Referer: "https://music.youtube.com/" },
      body: JSON.stringify({ context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20241023.01.00", hl: "en", gl: "BR" } }, query: `${t.artista} ${t.faixa}`, params: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D" }),
    });
    for (const o of andar(await r.json(), (x) => x.musicResponsiveListItemRenderer)) {
      const m = o.musicResponsiveListItemRenderer;
      const [titulo, info = ""] = (m.flexColumns || []).map((c) => (c.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []).map((x) => x.text).join(""));
      const artista = norm(info.split("•")[0]);
      const video = andar(m, (x) => typeof x.videoId === "string")[0]?.videoId;
      if (video && norm(semEdicao(titulo)) === norm(t.faixa) && artista.length > 3 && norm(t.artista).startsWith(artista)) return `https://music.youtube.com/watch?v=${video}`;
    }
  } catch { /* sem resultado */ }
  return null;
}

(async () => {
  const fichas = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "albuns", "albuns.json"), "utf8")).map((f) => [f.id, f]));
  for (const arq of fs.readdirSync(PASTA).filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "indice.json")) {
    const caminho = path.join(PASTA, arq);
    const edicao = JSON.parse(fs.readFileSync(caminho, "utf8"));
    for (const t of edicao.faixas || []) {
      if (!refazer && Object.keys(t.links || {}).length) continue;
      const f = fichas.get(t.album);
      if (!f) { console.log(`? ${t.faixa}: ficha ${t.album} não existe (rode criar-fichas.js)`); continue; }
      t.links = await linksDeFaixa(f, t.faixa);
      if (!t.links.youtubeMusic) { const yt = await youtubeMusicMusica(t); if (yt) t.links.youtubeMusic = yt; }
      console.log(`${Object.keys(t.links).length ? "✓" : "–"} ${t.faixa}: ${Object.keys(t.links).join(", ") || "nenhum"}`);
    }
    fs.writeFileSync(caminho, JSON.stringify(edicao, null, 2) + "\n");
  }
})();
