// Completa as fichas (data/albuns/albuns.json) que ficaram sem faixas, duração, gravadora ou data
// de lançamento, para que todas tenham as mesmas informações. Ordem das fontes:
//   faixas/duração — outra edição oficial do mesmo álbum no MusicBrainz com todos os tempos das
//                    faixas; senão, o álbum no Deezer
//   lançamento/gravadora — quadro do álbum (Infobox album) na Wikipédia em inglês; senão, Deezer
//                    (só a gravadora — a data do Deezer costuma ser a da reedição digital)
// Cada campo completado fica registrado em "complementos": { campo: "musicbrainz" | "deezer" |
// "wikipedia" }. Campos que já existem não são alterados.
// Uso: node scripts/completar-fichas.js

const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "data", "albuns", "albuns.json");
const UA = { "User-Agent": "MsqX/0.1 (https://github.com/MattRahmeier/msqx)", Accept: "application/json" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, "");
const semEdicao = (s) => (s || "").replace(/\s*[([][^)\]]*[)\]]/g, "").replace(/\s+-\s+.*$/, "").trim();
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const ultimo = {};
async function pedir(servico, url, intervalo) {
  const espere = intervalo - (Date.now() - (ultimo[servico] || 0));
  if (espere > 0) await espera(espere);
  ultimo[servico] = Date.now();
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) { const j = await r.json(); return j?.error ? null : j; }
      if (r.status === 404) return null;
    } catch { /* tenta de novo */ }
    await espera(4000 * (t + 1));
  }
  return null;
}
const mb = (c) => pedir("mb", `https://musicbrainz.org/ws/2/${c}`, 1100);
const deezer = (c) => pedir("deezer", `https://api.deezer.com/${c}`, 300);
const wiki = (p) => pedir("wiki", "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", formatversion: "2", redirects: "1", ...p }), 400);

const precisaFaixas = (f) => !f.faixas?.length || f.faixas.some((t) => !t.duracao) || !f.duracao;

// MusicBrainz: edição oficial com todas as faixas cronometradas (prefere a mais antiga).
async function faixasMusicBrainz(f) {
  if (!f.musicbrainz?.releaseGroup) return null;
  const r = await mb(`release?release-group=${f.musicbrainz.releaseGroup}&inc=recordings&fmt=json&limit=100`);
  const edicoes = (r?.releases || []).filter((v) => v.status === "Official")
    .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  for (const v of edicoes) {
    const faixas = (v.media || []).flatMap((m) => m.tracks || []);
    if (faixas.length && faixas.every((t) => t.length)) {
      return faixas.map((t, i) => ({ n: i + 1, titulo: t.title, duracao: mmss(Math.round(t.length / 1000)) }));
    }
  }
  return null;
}

async function albumDeezer(f) {
  let id = f.links?.deezer?.match(/album\/(\d+)/)?.[1];
  if (!id) {
    const primeiro = norm(f.artista.split(/,|&| and | e |•/)[0]);
    const q = encodeURIComponent(`artist:"${f.artista}" album:"${semEdicao(f.titulo)}"`);
    const r = await deezer(`search/album?q=${q}&limit=10`);
    const cand = (r?.data || []).filter((a) => norm(a.artist?.name).includes(primeiro) || primeiro.includes(norm(a.artist?.name)));
    id = (cand.find((a) => norm(semEdicao(a.title)) === norm(semEdicao(f.titulo))) || cand[0])?.id;
  }
  return id ? deezer(`album/${id}`) : null;
}

// Quadro "Infobox album" da Wikipédia: datas e gravadora (texto sem marcação).
const limpar = (s) => (s || "").replace(/<ref[\s\S]*?(\/>|<\/ref>)/g, "").replace(/<!--[\s\S]*?-->/g, "")
  .replace(/\{\{(?:start date|release date|dts)\|(\d{4})(?:\|(\d{1,2}))?(?:\|(\d{1,2}))?[^}]*\}\}/gi, (_, a, m, d) => [a, m && m.padStart(2, "0"), d && d.padStart(2, "0")].filter(Boolean).join("-"))
  .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1").replace(/\{\{[^{}]*\}\}/g, "").replace(/''+/g, "").replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ").trim();
const MESES = { january: "01", february: "02", march: "03", april: "04", may: "05", june: "06", july: "07", august: "08", september: "09", october: "10", november: "11", december: "12" };
function dataIso(s) {
  if (/^\d{4}(-\d{2}){0,2}/.test(s)) return s.match(/^\d{4}(-\d{2}){0,2}/)[0];
  const m = s.match(/(?:(\d{1,2})\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(\d{1,2}))?,?\s+(\d{4})/i);
  if (m) return [m[4], MESES[m[2].toLowerCase()], (m[1] || m[3]) && (m[1] || m[3]).padStart(2, "0")].filter(Boolean).join("-");
  return s.match(/\b(1[89]\d\d|20\d\d)\b/)?.[1] || null;
}

async function infobox(f) {
  const busca = await wiki({ action: "query", list: "search", srlimit: "5", srsearch: `${semEdicao(f.titulo)} ${f.artista} album` });
  for (const r of busca?.query?.search || []) {
    if (!norm(r.title).startsWith(norm(semEdicao(f.titulo)))) continue;
    const t = (await wiki({ action: "parse", page: r.title, prop: "wikitext" }))?.parse?.wikitext || "";
    const quadro = t.match(/\{\{\s*Infobox album[\s\S]*?\n\}\}/i)?.[0];
    if (!quadro) continue;
    const campo = (nome) => limpar(quadro.match(new RegExp(`\\|\\s*${nome}\\s*=([^\\n]*)`, "i"))?.[1]);
    if (!norm(campo("artist")).includes(norm(f.artista.split(/,|&| and /)[0]))) continue;
    return { lancamento: dataIso(campo("released")), gravadora: campo("label").split(/,|•| \/ /)[0].trim() || null };
  }
  return null;
}

(async () => {
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const alvo = fichas.filter((f) => f.titulo && f.artista && (precisaFaixas(f) || !f.lancamento || !f.gravadora));
  console.log(`${alvo.length} fichas incompletas.`);
  for (const f of alvo) {
    const feito = {};
    if (precisaFaixas(f)) {
      let faixas = await faixasMusicBrainz(f), fonte = "musicbrainz";
      if (!faixas) {
        const d = await albumDeezer(f);
        const lista = d?.tracks?.data || [];
        if (lista.length && lista.every((t) => t.duration)) { faixas = lista.map((t, i) => ({ n: i + 1, titulo: t.title, duracao: mmss(t.duration) })); fonte = "deezer"; }
        if (!f.gravadora && d?.label) { f.gravadora = d.label; feito.gravadora = "deezer"; }
      }
      if (faixas) {
        const total = faixas.reduce((s, t) => { const [m, sg] = t.duracao.split(":").map(Number); return s + m * 60 + sg; }, 0);
        f.faixas = faixas;
        f.duracao = mmss(total);
        feito.faixas = feito.duracao = fonte;
      }
    }
    if (!f.lancamento || !f.gravadora) {
      const ib = await infobox(f);
      if (!f.lancamento && ib?.lancamento) { f.lancamento = ib.lancamento; feito.lancamento = "wikipedia"; }
      if (!f.gravadora && ib?.gravadora) { f.gravadora = ib.gravadora; feito.gravadora = "wikipedia"; }
      if (!f.gravadora) {
        const d = await albumDeezer(f);
        if (d?.label) { f.gravadora = d.label; feito.gravadora = "deezer"; }
      }
    }
    if (Object.keys(feito).length) f.complementos = { ...(f.complementos || {}), ...feito };
    const falta = [!f.faixas?.length && "faixas", !f.duracao && "duração", !f.lancamento && "lançamento", !f.gravadora && "gravadora"].filter(Boolean);
    console.log(`${falta.length ? "–" : "✓"} ${f.id}  ${JSON.stringify(feito)}${falta.length ? `  falta: ${falta.join(", ")}` : ""}`);
  }
  fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
})();
