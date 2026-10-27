// Completa pelo Discogs as fichas (data/albuns/albuns.json) que continuaram sem faixas, duração,
// gravadora ou data de lançamento depois de completar-fichas.js (discos que não estão no MusicBrainz
// nem no Deezer). Usa o registro já ligado em "discogs"; sem ele, busca no banco do Discogs por artista
// e título (exige token). Do registro mestre usa a edição principal. Só dados da ficha, nunca texto.
// Cada campo completado fica registrado em "complementos": { campo: "discogs" }. Campos que já
// existem não são alterados (as faixas só são trocadas se faltam ou estão sem duração).
//
// Token pessoal do Discogs (discogs.com/settings/developers) na variável de ambiente DISCOGS_TOKEN —
// nunca no código nem nos dados.
// Uso: node scripts/completar-discogs.js [--mostrar]   (--mostrar: só lista o que acharia, sem gravar)

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ARQ = path.join(__dirname, "..", "data", "albuns", "albuns.json");
const mostrar = process.argv.includes("--mostrar");
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, "");
// Discogs numera homônimos ("Rush Hour (2)") e marca artistas com "*".
const limpar = (s) => (s || "").replace(/\s*\(\d+\)$/, "").replace(/\*$/, "").trim();
const segundos = (d) => { const p = String(d || "").split(":").map(Number); return p.some(isNaN) || !d ? null : p.reduce((a, b) => a * 60 + b, 0); };
// "Lady In Red EP" no Discogs é o "Lady in Red" do chart.
const semFormato = (s) => (s || "").replace(/\s+(EP|LP|E\.P\.?)$/i, "");
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// No Windows a variável de usuário pode não ter chegado ao processo ainda; lê do registro.
let token = process.env.DISCOGS_TOKEN;
if (!token && process.platform === "win32") {
  try { token = execSync('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'DISCOGS_TOKEN\',\'User\')"').toString().trim(); } catch { /* sem token */ }
}
const UA = { "User-Agent": "Tracklore/0.1 (https://github.com/MattRahmeier/tracklore)", ...(token && { Authorization: `Discogs token=${token}` }) };

let ultimo = 0;
async function discogs(caminho) {
  const espere = 1100 - (Date.now() - ultimo);
  if (espere > 0) await espera(espere);
  ultimo = Date.now();
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`https://api.discogs.com/${caminho}`, { headers: UA });
      if (r.ok) return r.json();
      if (r.status === 404 || r.status === 401) return null;
    } catch { /* tenta de novo */ }
    await espera(5000 * (t + 1));
  }
  return null;
}

const falta = (f) => !f.lancamento || !f.gravadora || !f.duracao || !f.faixas?.length || f.faixas.some((t) => !t.duracao);

// Do mestre, a edição principal — mas com o ano do mestre (o da primeira edição) quando é anterior.
async function principal(id) {
  const m = await discogs(`masters/${id}`);
  const r = m?.main_release && await discogs(`releases/${m.main_release}`);
  if (r && m.year && String(r.released || r.year).slice(0, 4) > String(m.year)) r.released = String(m.year);
  return r || null;
}

// Edição do Discogs: a do link da ficha, senão a achada na busca.
async function edicao(f) {
  const ligado = f.discogs?.match(/\/(master|release)\/(\d+)/);
  if (ligado) return ligado[1] === "release" ? discogs(`releases/${ligado[2]}`) : principal(ligado[2]);
  if (!token) return null;
  const varios = /^various/i.test(f.artista);
  const q = new URLSearchParams({ release_title: f.titulo.replace(/[–—]/g, "-"), per_page: "25", ...(!varios && { artist: f.artista }) });
  const r = await discogs(`database/search?${q}`);
  const alvo = norm(f.titulo);
  const achados = (r?.results || []).filter((x) => ["master", "release"].includes(x.type) && norm(semFormato(x.title.split(" - ").slice(1).join(" - "))) === alvo
    && (varios ? /^various/i.test(x.title) : norm(limpar(x.title.split(" - ")[0])) === norm(f.artista)));
  const mestre = achados.find((x) => x.type === "master");
  if (mestre) return principal(mestre.id);
  // Sem mestre: a edição mais antiga.
  const rel = achados.filter((x) => x.type === "release").sort((a, b) => (a.year || "9999").localeCompare(b.year || "9999"))[0];
  return rel ? discogs(`releases/${rel.id}`) : null;
}

(async () => {
  if (!token) console.log("Sem DISCOGS_TOKEN: só as fichas que já têm link do Discogs.\n");
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  for (const f of fichas.filter(falta)) {
    const r = await edicao(f);
    if (!r) { console.log(`– ${f.id}: não achado no Discogs`); continue; }
    const novos = {};
    if (!f.lancamento && (r.released || r.year)) novos.lancamento = String(r.released || r.year).replace(/-00/g, "");
    // "Not On Label (… Self-released)" é como o Discogs marca o lançamento pelo próprio artista.
    const selos = (r.labels || []).map((l) => limpar(l.name));
    const selo = selos.find((n) => !/^not on label/i.test(n)) || (selos.some((n) => /self-released/i.test(n)) ? "Lançamento independente" : null);
    if (!f.gravadora && selo) novos.gravadora = selo;
    const faixas = (r.tracklist || []).filter((t) => (t.type_ || "track") === "track")
      .map((t, i) => ({ n: i + 1, titulo: t.title, duracao: t.duration || null }));
    const comTempo = faixas.length && faixas.every((t) => segundos(t.duracao));
    const faixasFicha = f.faixas || [];
    if ((!faixasFicha.length || faixasFicha.some((t) => !t.duracao)) && comTempo && (!faixasFicha.length || faixas.length === faixasFicha.length)) novos.faixas = faixas;
    if (!f.duracao && (novos.faixas || (faixasFicha.length && faixasFicha.every((t) => segundos(t.duracao)) && faixasFicha))) {
      novos.duracao = mmss((novos.faixas || faixasFicha).reduce((s, t) => s + segundos(t.duracao), 0));
    }
    const link = `https://www.discogs.com/release/${r.id}`;
    console.log(`${Object.keys(novos).length ? "✓" : "·"} ${f.id} ← ${limpar(r.artists_sort || "")} - ${r.title} (${r.year || "?"}) ${link}`);
    for (const [k, v] of Object.entries(novos)) console.log(`    ${k}: ${k === "faixas" ? `${v.length} faixas` : v}`);
    if (!comTempo && faixas.length) console.log(`    (faixas no Discogs sem todos os tempos: ${faixas.length})`);
    if (mostrar) continue;
    Object.assign(f, novos);
    if (!f.discogs) f.discogs = link;
    if (Object.keys(novos).length) f.complementos = { ...f.complementos, ...Object.fromEntries(Object.keys(novos).map((k) => [k, "discogs"])) };
  }
  if (!mostrar) fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
})();
