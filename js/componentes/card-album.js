// Card de álbum: capa, título, artista · ano e botões de streaming com ícone.
// Usado em todas as áreas (Curadoria, Guia de Gêneros, Pesquisa). Devolve HTML.
//
// Streaming híbrido (roadmap.md, Fase 0): link direto quando a ficha tem `links`; sem ele,
// Spotify, YouTube Music e Qobuz abrem a busca "Artista Álbum". As demais plataformas só
// aparecem com link direto.

const PLATAFORMAS = [
  { id: "spotify", nome: "Spotify", busca: (q) => `https://open.spotify.com/search/${q}`, sempre: true },
  { id: "youtube", nome: "YouTube Music", busca: (q) => `https://music.youtube.com/search?q=${q}`, sempre: true },
  { id: "qobuz", nome: "Qobuz", busca: (q) => `https://www.qobuz.com/search?q=${q}`, sempre: true },
  { id: "appleMusic", nome: "Apple Music", icone: "apple" },
  { id: "deezer", nome: "Deezer" },
  { id: "tidal", nome: "Tidal" },
  { id: "bandcamp", nome: "Bandcamp" },
];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function botoes(ficha) {
  const links = ficha.links || {};
  const q = encodeURIComponent(`${ficha.artista} ${ficha.titulo}`);
  return PLATAFORMAS.filter((p) => links[p.id] || p.sempre).map((p) => {
    const direto = links[p.id];
    const rotulo = direto ? `Ouvir no ${p.nome}` : `Buscar no ${p.nome}`;
    return `<li><a class="plat" href="${esc(direto || p.busca(q))}" target="_blank" rel="noopener"
      ${direto ? "" : "data-busca"} aria-label="${rotulo}: ${esc(ficha.titulo)}" title="${rotulo}">
      <svg class="icone" aria-hidden="true"><use href="#i-${p.icone || p.id}"/></svg></a></li>`;
  }).join("");
}

// `nota`: frase opcional (ex.: do autor da Curadoria da Semana).
export function cardAlbum(ficha, { nota } = {}) {
  const ano = ficha.lancamento?.slice(0, 4);
  const capa = ficha.capa
    ? `<img src="${esc(ficha.capa)}" alt="" loading="lazy" decoding="async">`
    : `<span class="card-sem-capa" aria-hidden="true">${esc(ficha.titulo).slice(0, 1)}</span>`;
  return `
    <article class="card-album">
      <div class="card-capa">${capa}</div>
      <div class="card-info">
        <h3 class="card-titulo" title="${esc(ficha.titulo)}">${esc(ficha.titulo)}</h3>
        <p class="card-artista">${esc(ficha.artista)}${ano ? ` <span>· ${ano}</span>` : ""}</p>
      </div>
      <ul class="card-plataformas" aria-label="Ouvir">${botoes(ficha)}</ul>
      ${nota ? `<p class="card-nota">${esc(nota)}</p>` : ""}
    </article>`;
}
