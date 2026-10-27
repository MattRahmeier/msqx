// Descrição curta para as fichas sem "sobre" (álbuns sem artigo em nenhuma Wikipédia), montada só
// com os dados da própria ficha — decisão do usuário (27/10/2026). Não acrescenta nada além dos
// dados: tipo (coletânea, ao vivo ou álbum), artista, ano, gravadora e número de faixas.
//   Coletânea: "X é uma coletânea de Y que reúne gravações já lançadas do artista, publicada em
//   ANO pela GRAVADORA, com N faixas."
// sobreFonte: { tipo: "dados", url: <release-group no MusicBrainz> } — o site credita "Descrição
// montada com os dados do MusicBrainz".
// Ficha fora do MusicBrainz completada pelo Discogs (completar-discogs.js): url do Discogs e
// nome: "Discogs".
// Uso: node scripts/descrever-albuns.js [--refazer]   (--refazer: monta de novo as descrições
// "dados" já existentes, depois que a ficha ganhou dados)

const fs = require("fs");
const path = require("path");

const ARQ = path.join(__dirname, "..", "data", "albuns", "albuns.json");
const fichas = JSON.parse(fs.readFileSync(ARQ, "utf8"));

// Títulos que indicam coletânea mesmo sem a marca no MusicBrainz.
const COLETANEA = /\b(complete|recordings|best of|greatest|collected|collection|anthology|very best|essential|years)\b/i;

const refazer = process.argv.includes("--refazer");

let feitos = 0;
for (const f of fichas) {
  if ((f.sobre && !(refazer && f.sobreFonte?.tipo === "dados")) || !f.titulo || !f.artista) continue;
  const ano = f.lancamento?.slice(0, 4);
  const gravadora = f.gravadora === "Lançamento independente" ? " de forma independente" : f.gravadora ? ` pela ${f.gravadora}` : "";
  const quando = ano ? ` em ${ano}` : "";
  const faixas = f.faixas?.length ? `, com ${f.faixas.length} faixas` : "";
  let texto;
  if (/Compilation/.test(f.tipo || "") || COLETANEA.test(f.titulo)) {
    texto = `${f.titulo} é uma coletânea de ${f.artista} que reúne gravações já lançadas do artista, publicada${quando}${gravadora}${faixas}.`;
  } else if (/Live/.test(f.tipo || "")) {
    texto = `${f.titulo} é um álbum ao vivo de ${f.artista}, lançado${quando}${gravadora}${faixas}.`;
  } else if (/EP/.test(f.tipo || "")) {
    texto = `${f.titulo} é um EP de ${f.artista}, lançado${quando}${gravadora}${faixas}.`;
  } else {
    texto = `${f.titulo} é um álbum de ${f.artista}, lançado${quando}${gravadora}${faixas}.`;
  }
  f.sobre = texto;
  f.sobreFonte = f.musicbrainz?.releaseGroup ? { tipo: "dados", url: `https://musicbrainz.org/release-group/${f.musicbrainz.releaseGroup}` }
    : f.discogs && Object.values(f.complementos || {}).includes("discogs") ? { tipo: "dados", url: f.discogs, nome: "Discogs" }
    : { tipo: "dados", url: null };
  delete f.sobrePendente;
  feitos++;
  console.log(`${f.id}: ${texto}`);
}
fs.writeFileSync(ARQ, JSON.stringify(fichas, null, 2) + "\n");
console.log(`\n${feitos} descrições montadas.`);
