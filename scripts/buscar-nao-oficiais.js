// Link não oficial para fichas fora dos streamings populares — Spotify, YouTube Music, Apple Music e
// Deezer (data/albuns/albuns.json; pedido do usuário em 29/10/2026) —, mesmo que tenham Bandcamp,
// Tidal ou Qobuz: um
// upload de fã no YouTube, achado pela busca de vídeos do YouTube Music. Pedido do usuário
// (28/10/2026): "se não achou links oficiais, coloque um botão 'Não oficial' com o que tiver".
//   1. o álbum completo: título do vídeo com o artista e o título do álbum, e pelo menos 60% da duração
//      do álbum;
//   2. sem ele, uma faixa do álbum: título do vídeo com o artista e o nome de uma faixa da ficha (o
//      vídeo mais visto);
//   3. em música clássica, sem a gravação do disco, outra gravação da mesma obra;
//   4. por fim, outro vídeo do artista, com esse rótulo no botão.
// Sempre o vídeo direto, nunca a página de busca (pedido do usuário em 05/11/2026). Sem nada disso, null.
// Versões ao vivo, covers e remixes ficam de fora (salvo em álbum ao vivo).
// Grava ficha.naoOficial = { url, tipo: "album" | "faixa" | "obra" | "artista", titulo, canal }. O site mostra o
// botão não oficial (círculo vermelho do YouTube) só quando a ficha não está em nenhum streaming popular.
// Fichas sem vídeo são tentadas de novo a cada execução.
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

const POPULARES = ["spotify", "youtubeMusic", "appleMusic", "deezer"];
const foraDosPopulares = (f) => !POPULARES.some((p) => f.links?.[p]);

// Nomes para reconhecer o artista no vídeo: cada parte do crédito ("Bach; Bach Collegium Japan" ou
// "A & B"). Em música clássica o compositor vem antes do ";" e os vídeos costumam trazer só o sobrenome.
function nomesArtista(artista) {
  if (/^various artists$/i.test(artista)) return [];
  const partes = artista.split(/;|,| & | \/ | \+ | - | and | e | feat\.? | featuring /i).map((x) => x.trim()).filter(Boolean);
  const nomes = partes.map(norm).filter((n) => n.length >= 3);
  if (artista.includes(";")) nomes.push(norm(partes[0].split(" ").pop()));
  return [...new Set(nomes)];
}
// Clássica: o disco é uma gravação específica, então o intérprete (depois do ";") também precisa aparecer.
const interpretes = (artista) => (artista.includes(";") ? artista.split(";")[1].split(/,|&/).map((x) => norm(x)).filter((n) => n.length >= 4) : []);
// Vídeos conferidos à mão e recusados: acharam o nome, mas são outro disco.
const REJEITADOS = new Set(["EERLohy--f4","f42tMGPEkCE","Iui_EaHo1r0","dkifyheeyFI","_bfPpb9Fakc","7zs-O7tSk5M","5jVcJGdMgsc","qTb12BI2XLE","-kmhffp6Jig","NVrdBz7aDkM","NQnfD-1xZNI"]);
// Título sem subtítulo: "Cold Heat: Heavy Funk Rarities, Volume 1" → "Cold Heat"; "Mu (First Part)" → "Mu".
const tituloCurto = (t) => t.split(/\s*[:(\/]\s*/)[0];

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const alvo = fichas.filter((f) => f.titulo && f.artista && foraDosPopulares(f) && (refazer || !f.naoOficial?.url) && (!ids || ids.has(f.id)));
  console.log(`${alvo.length} fichas fora dos streamings populares`);
  let feitos = 0;
  for (const f of alvo) {
    const nomes = nomesArtista(f.artista);
    const album = norm(f.titulo);
    const curto = norm(tituloCurto(f.titulo));
    const duracao = segundos(f.duracao);
    const quem = nomes.length ? f.artista.split(/;|,/)[0] : "";
    const achados = [...await videos(`${f.artista} ${f.titulo} full album`), ...await videos(`${f.artista} ${f.titulo}`)];
    // Crédito longo ou título com subtítulo atrapalham a busca: tenta também só o essencial.
    if (`${quem} ${tituloCurto(f.titulo)}`.trim() !== `${f.artista} ${f.titulo}`.trim()) achados.push(...await videos(`${quem} ${tituloCurto(f.titulo)} full album`));
    // Fora: versões ao vivo, covers, remixes e afins (a não ser que o próprio álbum seja ao vivo).
    const outraVersao = /\b(live|ao vivo|concert|cover|remix|karaoke|instrumental|ai|reimagined|extended)\b|ライブ|カバー/i;
    const aoVivo = /live/i.test(f.tipo || "");
    const certos = achados.filter((v) => !REJEITADOS.has(v.id) && (aoVivo || !outraVersao.test(v.titulo)));
    const quemToca = interpretes(f.artista);
    const temNome = (v) => nomes.some((n) => norm(v.titulo + v.canal).includes(n));
    const comArtista = certos.filter((v) => temNome(v) && (!quemToca.length || quemToca.some((n) => norm(v.titulo + v.canal).includes(n))));
    // Coletânea ("Various Artists") não tem artista para conferir: só vale o título do disco.
    const comTitulo = (v) => norm(v.titulo).includes(curto.length >= 4 ? curto : album);
    const candidatos = nomes.length ? comArtista.filter(comTitulo) : certos.filter((v) => album.length >= 8 && norm(v.titulo).includes(album));
    // Com a duração do disco: de 60% a 160% dela. Sem ela, pelo menos 15 minutos (menos que isso é uma faixa).
    const completo = candidatos.filter((v) => (duracao ? v.duracao >= duracao * 0.6 && v.duracao <= duracao * 1.6 : v.duracao >= 900)).sort((a, b) => b.visto - a.visto)[0];
    const maisVisto = (l) => [...l].sort((a, b) => b.visto - a.visto)[0];
    const faixas = (f.faixas || []).map((t) => ({ titulo: t.titulo, n: norm(t.titulo) })).filter((t) => t.n.length >= 5);
    const ehFaixa = (v) => faixas.some((t) => norm(v.titulo).includes(t.n));
    let faixa = !completo && maisVisto([...comArtista.filter(ehFaixa), ...candidatos]);
    // Procura as próprias faixas, uma a uma, antes de desistir.
    if (!completo && !faixa && nomes.length) {
      for (const t of faixas.slice(0, 5)) {
        const achou = maisVisto((await videos(`${quem} ${t.titulo}`)).filter((v) => !REJEITADOS.has(v.id) && (aoVivo || !outraVersao.test(v.titulo)) && temNome(v) && norm(v.titulo).includes(t.n)));
        if (achou) { faixa = achou; break; }
      }
    }
    // Clássica: a mesma obra, com o compositor, em outra gravação.
    const obra = !completo && !faixa && quemToca.length && maisVisto(certos.filter((v) => temNome(v) && comTitulo(v) && v.duracao >= 600));
    // Por fim, qualquer vídeo do artista (nome inteiro no título ou no canal).
    const nomeInteiro = norm(f.artista.split(";").pop().split(",")[0]);
    const doArtista = !completo && !faixa && !obra && nomes.length && nomeInteiro.length >= 6 && maisVisto(certos.filter((v) => norm(v.titulo + v.canal).includes(nomeInteiro)));
    const v = completo || faixa || obra || doArtista || null;
    f.naoOficial = v ? { url: `https://www.youtube.com/watch?v=${v.id}`, tipo: completo ? "album" : faixa ? "faixa" : obra ? "obra" : "artista", titulo: v.titulo, canal: v.canal } : null;
    console.log(`${v ? "✓" : "–"} ${f.id}${v ? ` [${f.naoOficial.tipo}] ${v.titulo} (${v.canal}) ${v.duracao}s de ${duracao}s` : ""}`);
    if (++feitos % 20 === 0) fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  }
  fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
})();
