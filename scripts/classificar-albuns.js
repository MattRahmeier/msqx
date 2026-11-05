// Liga cada ficha aos gêneros da árvore que fontes abertas atribuem ao álbum (coletados por
// buscar-generos-albuns.js em fontes/generos-albuns.json), além dos gêneros que já vêm dos charts.
// Grava em cada ficha:
//   estilos      — ids dos gêneros da árvore que não vêm dos charts (o site soma aos dos charts)
//   estilosFonte — { "<id>": "wikidata" | "musicbrainz" } (a primeira fonte que trouxe o gênero)
// Regras: todo gênero do Wikidata (P136) conta; do MusicBrainz, só os com pelo menos metade dos votos
// do gênero mais votado do álbum (os votos são poucos e às vezes aleatórios). Nomes comparados sem
// caixa, acento, hífen e "music"; os apelidos abaixo cobrem os nomes usuais nas duas fontes.
// Uso: node scripts/classificar-albuns.js [--mostrar]

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const ARQ = path.join(RAIZ, "data", "albuns", "albuns.json");
const CACHE = path.join(RAIZ, "fontes", "generos-albuns.json");
const mostrar = process.argv.includes("--mostrar");

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\(music\)|\bmusic\b|\bgenre\b/g, "").replace(/['’]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");

// Nome da fonte → id da árvore, quando o nome não é igual ao da árvore.
const APELIDOS = {
  "rock n roll": "rock-and-roll", "rock and roll": "rock-and-roll", "surf": "surf-rock", "shoegazing": "shoegaze",
  "synthpop": "synth-pop", "electronic": "eletronica", "electronica": "eletronica", "electronic dance": "eletronica",
  "intelligent dance": "idm", "drum n bass": "drum-and-bass", "dnb": "drum-and-bass", "2-step": "uk-garage", "2 step garage": "uk-garage",
  "hip hop": "hip-hop", "rap": "hip-hop", "dirty south": "southern-hip-hop", "dirty rap": "southern-hip-hop",
  "golden age hip hop": "east-coast-hip-hop", "old school hip hop": "old-school-hip-hop", "political hip hop": "conscious-hip-hop",
  "trap": "trap", "drill": "drill", "uk drill": "uk-drill", "horrorcore": null,
  "nwobhm": "nwobhm", "new wave of british heavy metal": "nwobhm", "nu-metal": "nu-metal", "rap metal": "nu-metal",
  "dixieland": "new-orleans-jazz", "traditional jazz": "new-orleans-jazz", "hot jazz": "new-orleans-jazz", "trad jazz": "new-orleans-jazz",
  "swing": "swing", "big band": "swing", "jazz-funk": "jazz-fusion", "jazz rock": "jazz-fusion", "fusion": "jazz-fusion",
  "boogie woogie": "boogie-woogie", "piedmont blues": "piedmont-blues", "texas blues": "texas-blues",
  "british blues": "british-blues", "british rhythm and blues": "british-blues",
  "gothic rock": "gothic-rock", "goth rock": "gothic-rock", "post-punk": "post-punk", "new wave": "new-wave",
  "teen pop": "teen-pop", "dance pop": "dance-pop", "bubblegum": "bubblegum-pop", "bubblegum pop": "bubblegum-pop",
  "glam": "glam-rock", "glam rock": "glam-rock", "glitter rock": "glam-rock", "indie": "indie-rock",
  "electro-pop": "electropop", "jpop": "j-pop", "kpop": "k-pop", "shibuya kei": "shibuya-kei",
  "acid house": "acid-house", "electro swing": "electro-swing", "microhouse": "minimal-techno",
  "ska punk": "third-wave-ska", "skacore": "third-wave-ska", "ska core": "third-wave-ska",
  "classical": "musica-classica", "western classical": "musica-classica", "art music": "musica-classica",
  "renaissance": "musica-renascentista", "baroque": "musica-barroca", "classical period": "periodo-classico",
  "romantic": "romantismo", "romantic classical": "romantismo", "romanticism": "romantismo", "impressionism": "impressionismo",
  "modern classical": "musica-moderna", "20th century classical": "musica-moderna", "modernism": "musica-moderna",
  "choral": "musica-coral", "choir": "musica-coral", "chamber": "musica-de-camara", "symphony": "sinfonia", "concerto": "concerto",
};

(async () => {
  const generos = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "generos", "generos.json"), "utf8"));
  const indice = new Map();
  for (const g of generos) { indice.set(norm(g.nome), g.id); indice.set(norm(g.id), g.id); }
  for (const [nome, id] of Object.entries(APELIDOS)) indice.set(norm(nome), id);
  const achar = (nome) => indice.get(norm(nome));
  const pai = new Map(generos.map((g) => [g.id, g.pai]));

  const cache = JSON.parse(fs.readFileSync(CACHE, "utf8"));
  const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  const contagem = {};
  for (const f of fichas) {
    const c = cache[f.id];
    delete f.estilos; delete f.estilosFonte;
    if (!c) continue;
    const fonte = {};
    for (const nome of c.wikidataGeneros || []) { const id = achar(nome); if (id) fonte[id] ??= "wikidata"; }
    const topo = Math.max(0, ...(c.musicbrainz || []).map((g) => g.votos));
    for (const g of c.musicbrainz || []) { const id = achar(g.nome); if (id && g.votos * 2 >= topo) fonte[id] ??= "musicbrainz"; }
    // Fora: o que já vem dos charts e os ancestrais de qualquer gênero do álbum (o mestre já mostra
    // os álbuns dos subgêneros; "Eletrônica" num disco de techno não acrescenta nada).
    const todos = [...(f.generos || []), ...Object.keys(fonte)];
    for (const id of todos) for (let p = pai.get(id); p; p = pai.get(p)) delete fonte[p];
    for (const id of f.generos || []) delete fonte[id];
    // Música Clássica e subgêneros só recebem discos postos à mão nos charts (pedido do usuário em
    // 04/11/2026): trilhas e discos orquestrados ou "contemporary classical" de outros gêneros ficam
    // só no próprio catálogo.
    for (const id of Object.keys(fonte)) if (id === "musica-classica" || pai.get(id) === "musica-classica") delete fonte[id];
    if (!Object.keys(fonte).length) continue;
    f.estilos = Object.keys(fonte);
    f.estilosFonte = fonte;
    for (const id of f.estilos) contagem[id] = (contagem[id] || 0) + 1;
    if (mostrar) console.log(`${f.id}: ${f.estilos.join(", ")}`);
  }
  if (!mostrar) fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
  console.log(`\n${fichas.filter((f) => f.estilos).length} fichas com estilos extras`);
  console.log(Object.entries(contagem).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(" "));
})();
