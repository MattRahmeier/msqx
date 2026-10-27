// Completa "reviews" das fichas (data/albuns/albuns.json) que têm menos de duas notas da crítica,
// com fontes além do quadro da Wikipédia (decisão do usuário, 27/10/2026). Só nota e link — o
// texto das críticas tem direitos reservados e não é copiado.
//   Pitchfork — resenha do álbum (busca pelo título no site — a busca não acha com o artista junto;
//               o artista é conferido no título da resenha; nota de 0 a 10)
//   Metacritic — nota da crítica agregada (Metascore de 0 a 100, que o site só mostra com quatro
//              críticas ou mais), pela API de busca do próprio site; confere artista, título e ano (±1)
//   Discogs  — média das avaliações dos usuários (API pública; mínimo de 10 votos), pelo link do
//              Discogs que o MusicBrainz tem para o álbum; aparece como "Discogs (usuários)"
// Ficam só notas positivas (estrelas >= 3,5) e no máximo duas por ficha, junto com as que já existem.
// Sites que bloqueiam acesso automatizado (AllMusic, RYM, Album of the Year, Metal Archives,
// ProgArchives, Angry Metal Guy) não são consultados; o Wikidata não tem notas para estas fichas.
// Uso: node scripts/buscar-criticas-extras.js [--so metacritic,discogs,pitchfork]

const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "data", "albuns", "albuns.json");
const UA = { "User-Agent": "Mozilla/5.0 (Tracklore; https://github.com/MattRahmeier/tracklore)" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, "");
const semEdicao = (s) => (s || "").replace(/\s*[([][^)\]]*[)\]]/g, "").replace(/\s+-\s+.*$/, "").trim();
// Estrelas de meia em meia, sempre arredondadas para cima (decisão do usuário); o 1e-9 evita que
// erros de ponto flutuante (0,7 × 5 = 3,5000000000000004) subam meia estrela a mais.
const meio = (x) => Math.ceil(x * 2 - 1e-9) / 2;

const ultimo = {};
async function pedir(servico, url, intervalo, formato = "json") {
  const espere = intervalo - (Date.now() - (ultimo[servico] || 0));
  if (espere > 0) await espera(espere);
  ultimo[servico] = Date.now();
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return formato === "json" ? r.json() : r.text();
      if ([403, 404].includes(r.status)) return null;
    } catch { /* tenta de novo */ }
    await espera(5000 * (t + 1));
  }
  return null;
}

async function pitchfork(f) {
  const html = await pedir("pitchfork", `https://pitchfork.com/search/?query=${encodeURIComponent(semEdicao(f.titulo))}`, 1500, "texto");
  const caminhos = [...new Set([...(html || "").matchAll(/\/reviews\/albums\/[a-z0-9-]+\/?/g)].map((m) => m[0]))].slice(0, 4);
  const primeiro = norm(f.artista.split(/,|&| and | e |•/)[0]);
  for (const c of caminhos) {
    const pagina = await pedir("pitchfork", `https://pitchfork.com${c}`, 1500, "texto");
    // Título da página: "Artista: Álbum Album Review | Pitchfork"
    const titulo = pagina?.match(/<title>([^<]*)<\/title>/)?.[1]?.replace(/\s*Album Review.*$/, "") || "";
    const [artista, ...resto] = titulo.split(":");
    if (!norm(artista).includes(primeiro) || norm(semEdicao(resto.join(":"))) !== norm(semEdicao(f.titulo))) continue;
    const nota = Number(pagina.match(/"rating":\s*([\d.]+)/)?.[1]);
    if (!Number.isFinite(nota)) continue;
    return { fonte: "Pitchfork", nota: `${nota}/10`, estrelas: meio(nota / 2), url: `https://pitchfork.com${c}` };
  }
  return null;
}

async function metacritic(f) {
  const busca = encodeURIComponent(semEdicao(f.titulo));
  const j = await pedir("metacritic", `https://backend.metacritic.com/finder/metacritic/search/${busca}/web?mcoTypeId=31&limit=20`, 1500);
  const primeiro = norm(f.artista.split(/,|&| and | e |•/)[0]);
  const ano = Number(String(f.lancamento || "").slice(0, 4));
  for (const i of j?.data?.items || []) {
    const nota = i.criticScoreSummary?.score;
    if (!nota || norm(semEdicao(i.title)) !== norm(semEdicao(f.titulo))) continue;
    if (!(i.artists || []).some((a) => norm(a.name).includes(primeiro))) continue;
    const anoMc = Number(String(i.releaseDate || "").slice(0, 4));
    if (ano && anoMc && Math.abs(ano - anoMc) > 1) continue;
    return { fonte: "Metacritic", nota: `${nota}/100`, estrelas: meio(nota / 20), url: `https://www.metacritic.com${i.criticScoreSummary.url}` };
  }
  return null;
}

async function discogs(f) {
  if (!f.musicbrainz?.releaseGroup) return null;
  const rg = await pedir("mb", `https://musicbrainz.org/ws/2/release-group/${f.musicbrainz.releaseGroup}?fmt=json&inc=url-rels`, 1100);
  const url = rg?.relations?.find((r) => r.type === "discogs")?.url?.resource;
  let release = url?.match(/\/release\/(\d+)/)?.[1];
  const master = url?.match(/\/master\/(\d+)/)?.[1];
  if (master) release = (await pedir("discogs", `https://api.discogs.com/masters/${master}`, 2600))?.main_release;
  if (!release) return null;
  const r = await pedir("discogs", `https://api.discogs.com/releases/${release}/rating`, 2600);
  const { count, average } = r?.rating || {};
  if (!count || count < 10) return null;
  return { fonte: "Discogs (usuários)", nota: `${average.toFixed(2).replace(/0$/, "")}/5`, estrelas: meio(average), url: url, votos: count };
}

const so = process.argv.includes("--so") ? process.argv[process.argv.indexOf("--so") + 1].split(",") : null;
const fontes = [pitchfork, metacritic, discogs].filter((b) => !so || so.includes(b.name));

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const alvo = fichas.filter((f) => f.titulo && f.artista && (f.reviews?.length || 0) < 2);
  console.log(`${alvo.length} fichas com menos de duas notas.`);
  let feitos = 0;
  for (const f of alvo) {
    const atuais = f.reviews || [];
    const novas = [];
    for (const buscar of fontes) {
      if (atuais.length + novas.length >= 2) break;
      const r = await buscar(f);
      if (r && r.estrelas >= 3.5 && !atuais.some((a) => norm(a.fonte).startsWith(norm(r.fonte.split(" ")[0])))) novas.push(r);
    }
    if (novas.length) { f.reviews = [...atuais, ...novas].sort((a, b) => b.estrelas - a.estrelas).slice(0, 2); feitos++; }
    console.log(`${novas.length ? "✓" : "–"} ${f.id}${novas.length ? `: ${novas.map((r) => `${r.fonte} ${r.nota}`).join("; ")}` : ""}`);
    if (feitos && feitos % 10 === 0) fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  }
  fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  console.log(`\n${feitos} fichas ganharam notas · sem nenhuma nota: ${fichas.filter((f) => !f.reviews?.length).length}`);
})();
