// Descrição de um gênero (resumo + como soa), com os links para os gêneros citados e a fonte.
// Cópia da Wikipédia: "Fonte: Wikipédia"; paráfrase: "Baseado em: <fonte>" (modelo-de-dados.md).
import { esc } from "./card-album.js";

function comLinks(texto, links, rota) {
  let html = "";
  let pos = 0;
  for (const l of [...(links || [])].sort((a, b) => a.de - b.de)) {
    html += esc(texto.slice(pos, l.de)) + `<a href="#/${rota}/${esc(l.genero)}">${esc(texto.slice(l.de, l.ate))}</a>`;
    pos = l.ate;
  }
  return html + esc(texto.slice(pos));
}

// Crédito dos textos, numa citação só (mesmo quando o resumo e o "como soa" vêm de artigos
// diferentes): "Fonte: Wikipédia" ou "Fonte: Wikipédia em inglês" (os dois links, se houver dois).
// Texto traduzido ganha o aviso "Traduzido do inglês" na linha de cima; paráfrase, "Baseado em".
// Também usado na caixa do álbum.
// Nome do idioma da Wikipédia de origem ("Wikipédia em espanhol", "Traduzido do espanhol").
const IDIOMAS = { en: "inglês", es: "espanhol", fr: "francês", de: "alemão", it: "italiano", nl: "holandês", sv: "sueco", no: "norueguês", fi: "finlandês", da: "dinamarquês", pl: "polonês", cs: "tcheco", hu: "húngaro", ru: "russo", uk: "ucraniano", ja: "japonês" };

export function creditos(fontes) {
  // Descrição montada com os dados da ficha (álbum sem artigo em nenhuma Wikipédia).
  const dados = fontes.find((f) => f?.tipo === "dados");
  if (dados) return dados.url ? `Descrição montada com os dados do <a href="${esc(dados.url)}" target="_blank" rel="noopener">${esc(dados.nome || "MusicBrainz")}</a>` : "Descrição montada com os dados da ficha";
  fontes = fontes.filter((f) => f?.url);
  if (!fontes.length) return "";
  const nome = (f) => (f.tipo === "parafrase" ? esc(f.autor || new URL(f.url).hostname) : `Wikipédia${IDIOMAS[f.idioma] ? ` em ${IDIOMAS[f.idioma]}` : ""}`);
  const links = fontes.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${nome(f)}</a>`).join(" e ");
  const wiki = fontes.filter((f) => f.tipo !== "parafrase");
  const licenca = wiki.length ? ` (${esc(wiki[0].licenca || "CC BY-SA 4.0")})` : "";
  const traduzidos = fontes.filter((f) => f.traduzido).length;
  const origens = [...new Set(fontes.filter((f) => f.traduzido).map((f) => IDIOMAS[f.idioma] || "inglês"))].join(" e do ");
  const aviso = traduzidos ? `${traduzidos < fontes.length ? "Em parte traduzido" : "Traduzido"} do ${origens}<br>` : "";
  const rotulo = wiki.length < fontes.length ? "Baseado em" : traduzidos === fontes.length ? "Original" : "Fonte";
  return `${aviso}${rotulo}: ${links}${licenca}`;
}

// Descrição contínua do gênero: o resumo seguido de "como soa" (som — os elementos que definem o
// som, da seção de características da Wikipédia), num só parágrafo, com as fontes embaixo.
// `rota`: área para onde os links levam (padrão: o TrackMap).
export function resumoGenero(genero, { rota = "trackmap" } = {}) {
  const partes = [[genero?.resumo, genero?.resumoLinks, genero?.resumoFonte], [genero?.som, genero?.somLinks, genero?.somFonte]].filter(([t]) => t);
  if (!partes.length) return "";
  const texto = partes.map(([t, l]) => comLinks(t, l, rota)).join(" ");
  // Mesmo artigo nas duas partes: um link só.
  const fontes = [];
  for (const [, , f] of partes) if (f?.url && !fontes.some((x) => x.url.split("#")[0] === f.url.split("#")[0])) fontes.push(f);
  return `<p class="resumo-genero">${texto}</p>${fontes.length ? `<p class="resumo-fonte">${creditos(fontes)}</p>` : ""}`;
}
