// Resumo de um gênero com os links para os gêneros citados (resumoLinks) e a fonte.
// Cópia da Wikipédia: "Fonte: Wikipédia"; paráfrase: "Baseado em: <fonte>" (modelo-de-dados.md).
import { esc } from "./card-album.js";

export function resumoGenero(genero) {
  if (!genero?.resumo) return "";
  const t = genero.resumo;
  let html = "";
  let pos = 0;
  for (const l of [...(genero.resumoLinks || [])].sort((a, b) => a.de - b.de)) {
    html += esc(t.slice(pos, l.de)) + `<a href="#/cerebro/${esc(l.genero)}">${esc(t.slice(l.de, l.ate))}</a>`;
    pos = l.ate;
  }
  html += esc(t.slice(pos));

  const f = genero.resumoFonte;
  const fonte = !f?.url ? ""
    : f.tipo === "parafrase"
      ? `Baseado em: <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.autor || new URL(f.url).hostname)}</a>`
      : `Fonte: <a href="${esc(f.url)}" target="_blank" rel="noopener">Wikipédia</a> (${esc(f.licenca || "CC BY-SA 4.0")})`;
  return `<p class="resumo-genero">${html}</p>${fonte ? `<p class="resumo-fonte">${fonte}</p>` : ""}`;
}
