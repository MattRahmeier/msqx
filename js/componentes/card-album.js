// Card de álbum: capa, título, artista · ano e botões de streaming com ícone.
// Usado em todas as áreas (Curadoria, Guia de Gêneros, Pesquisa). Devolve HTML.
// A capa é um botão (data-album) que abre a caixa lateral do álbum (painel-album.js).
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

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Botões de streaming. `comNome`: mostra o nome da plataforma ao lado do ícone (caixa lateral).
export function botoesStreaming(ficha, { comNome = false } = {}) {
  const links = ficha.links || {};
  const q = encodeURIComponent(`${ficha.artista} ${ficha.titulo}`);
  return PLATAFORMAS.filter((p) => links[p.id] || p.sempre).map((p) => {
    const direto = links[p.id];
    const rotulo = direto ? `Ouvir no ${p.nome}` : `Buscar no ${p.nome}`;
    return `<li><a class="plat${comNome ? " plat-nome" : ""}" href="${esc(direto || p.busca(q))}" target="_blank" rel="noopener"
      ${direto ? "" : "data-busca"} aria-label="${rotulo}: ${esc(ficha.titulo)}" title="${rotulo}">
      <svg class="icone" aria-hidden="true"><use href="#i-${p.icone || p.id}"/></svg>${comNome ? `<span>${p.nome}</span>` : ""}</a></li>`;
  }).join("");
}

export function capaHtml(ficha, { lazy = true } = {}) {
  return ficha.capa
    ? `<img src="${esc(ficha.capa)}" alt="" loading="${lazy ? "lazy" : "eager"}" decoding="async">`
    : `<span class="card-sem-capa" aria-hidden="true">${esc(ficha.titulo).slice(0, 1)}</span>`;
}

// `nota`: frase opcional (ex.: do autor da Curadoria da Semana).
export function cardAlbum(ficha, { nota } = {}) {
  const ano = ficha.lancamento?.slice(0, 4);
  const capa = ficha.id
    ? `<button type="button" class="card-capa" data-album="${esc(ficha.id)}" aria-label="Detalhes de ${esc(ficha.titulo)}" aria-haspopup="dialog">${capaHtml(ficha)}</button>`
    : `<div class="card-capa">${capaHtml(ficha)}</div>`;
  return `
    <article class="card-album">
      ${capa}
      <div class="card-info">
        <h3 class="card-titulo" title="${esc(ficha.titulo)}">${esc(ficha.titulo)}</h3>
        <p class="card-artista">${esc(ficha.artista)}${ano ? ` <span>· ${ano}</span>` : ""}</p>
      </div>
      <ul class="card-plataformas" aria-label="Ouvir">${botoesStreaming(ficha)}</ul>
      ${nota ? `<p class="card-nota">${esc(nota)}</p>` : ""}
    </article>`;
}
