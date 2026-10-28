// Link não oficial para fichas sem nenhum link oficial de streaming (data/albuns/albuns.json): um
// upload de fã no YouTube, achado pela busca de vídeos do YouTube Music. Pedido do usuário
// (28/10/2026): "se não achou links oficiais, coloque um botão 'Não oficial' com o que tiver".
//   1. o álbum completo: título do vídeo com o artista e o título do álbum, e pelo menos 60% da duração
//      do álbum;
//   2. sem ele, uma faixa do álbum: título do vídeo com o artista e o nome de uma faixa da ficha (o
//      vídeo mais visto).
// Versões ao vivo, covers e remixes ficam de fora (salvo em álbum ao vivo).
// Grava ficha.naoOficial = { url, tipo: "album" | "faixa", titulo, canal }. O site mostra o botão
// "Não oficial" só quando a ficha não tem link oficial.
// Uso: node scripts/buscar-nao-oficiais.js [--ids id1,id2] [--refazer]

const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "data", "albuns", "albuns.json");
const ids = process.argv.includes("--ids") ? new Set(process.argv[process.argv.indexOf("--ids") + 1].split(",")) : null;
const refazer = process.argv.includes("--refazer");
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
const segundos = (d) => (d || "").split(":").reduce((a, b) => a * 60 + Number(b), 0);
const andar = (o, fn, s = []) => { if (o && typeof o === "object") { if (fn(o)) s.push(o); for (const v of Object.values(o)) andar(v, fn, s); } return s; };
const visualizacoes = (s) => { const m = (s || "").match(/([\d.,]+)\s*([KMB]?)\s*views?/i); return m ? parseFloat(m[1].replace(/,/g, "")) * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()] || 1) : 0; };

async function videos(consulta) {
  await espera(800);
  try {
    const r = await fetch("https://music.youtube.com/youtubei/v1/search?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://music.youtube.com", Referer: "https://music.youtube.com/" },
      body: JSON.stringify({ context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20241023.01.00", hl: "en", gl: "BR" } }, query: consulta, params: "EgWKAQIQAWoKEAkQChAFEAMQBA%3D%3D" }),
    });
    return andar(await r.json(), (x) => x.musicResponsiveListItemRenderer).map((o) => {
      const m = o.musicResponsiveListItemRenderer;
      const [titulo, info = ""] = (m.flexColumns || []).map((c) => (c.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []).map((x) => x.text).join(""));
      const partes = info.split("•").map((x) => x.trim());
      return { id: andar(m, (x) => typeof x.videoId === "string")[0]?.videoId, titulo, canal: partes[0], visto: visualizacoes(info), duracao: segundos(partes.find((p) => /^\d+(:\d\d)+$/.test(p))) };
    }).filter((v) => v.id && v.titulo);
  } catch { return []; }
}

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const alvo = fichas.filter((f) => f.titulo && f.artista && !Object.keys(f.links || {}).length && (refazer || !("naoOficial" in f)) && (!ids || ids.has(f.id)));
  console.log(`${alvo.length} fichas sem link oficial`);
  let feitos = 0;
  for (const f of alvo) {
    const artista = norm(f.artista.split(/,| & | and | e /)[0]);
    const album = norm(f.titulo);
    const duracao = segundos(f.duracao);
    const achados = [...await videos(`${f.artista} ${f.titulo} full album`), ...await videos(`${f.artista} ${f.titulo}`)];
    // Fora: versões ao vivo, covers, remixes e afins (a não ser que o próprio álbum seja ao vivo).
    const outraVersao = /\b(live|concert|cover|remix|karaoke|instrumental|ai)\b|ライブ|カバー/i;
    const aoVivo = /live/i.test(f.tipo || "");
    const comArtista = achados.filter((v) => norm(v.titulo + v.canal).includes(artista) && (aoVivo || !outraVersao.test(v.titulo)));
    const completo = comArtista.filter((v) => norm(v.titulo).includes(album) && (!duracao || v.duracao >= duracao * 0.6)).sort((a, b) => b.visto - a.visto)[0];
    const faixas = (f.faixas || []).map((t) => norm(t.titulo)).filter((t) => t.length >= 5);
    const faixa = !completo && comArtista.filter((v) => faixas.some((t) => norm(v.titulo).includes(t))).sort((a, b) => b.visto - a.visto)[0];
    const v = completo || faixa;
    f.naoOficial = v ? { url: `https://www.youtube.com/watch?v=${v.id}`, tipo: completo ? "album" : "faixa", titulo: v.titulo, canal: v.canal } : null;
    console.log(`${v ? "✓" : "–"} ${f.id}${v ? ` [${f.naoOficial.tipo}] ${v.titulo} (${v.canal})` : ""}`);
    if (++feitos % 20 === 0) fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  }
  fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
})();
