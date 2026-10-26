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

// Crédito de um texto: paráfrase, cópia da Wikipédia ou tradução (com aviso e link para o original).
// Também usado na caixa do álbum.
export function creditoFonte(f) {
  if (f.tipo === "parafrase") return `Baseado em: <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.autor || new URL(f.url).hostname)}</a>`;
  const link = `<a href="${esc(f.url)}" target="_blank" rel="noopener">Wikipédia${f.idioma === "en" ? " em inglês" : ""}</a>`;
  const licenca = esc(f.licenca || "CC BY-SA 4.0");
  return f.traduzido ? `Traduzido do inglês. Original: ${link} (${licenca})` : `Fonte: ${link} (${licenca})`;
}

// Descrição contínua do gênero: o resumo seguido de "como soa" (som — os elementos que definem o
// som, da seção de características da Wikipédia), num só parágrafo, com as fontes embaixo.
// `rota`: área para onde os links levam (padrão: o TrackMap).
export function resumoGenero(genero, { rota = "cerebro" } = {}) {
  const partes = [[genero?.resumo, genero?.resumoLinks, genero?.resumoFonte], [genero?.som, genero?.somLinks, genero?.somFonte]].filter(([t]) => t);
  if (!partes.length) return "";
  const texto = partes.map(([t, l]) => comLinks(t, l, rota)).join(" ");
  // Mesmo artigo nas duas partes: uma fonte só.
  const fontes = [];
  for (const [, , f] of partes) if (f?.url && !fontes.some((x) => x.url.split("#")[0] === f.url.split("#")[0])) fontes.push(f);
  return `<p class="resumo-genero">${texto}</p>${fontes.length ? `<p class="resumo-fonte">${fontes.map(creditoFonte).join(" · ")}</p>` : ""}`;
}
