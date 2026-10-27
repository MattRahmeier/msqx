// Card de álbum: capa, título, artista · ano e botões de streaming com ícone.
// Usado em todas as áreas (Curadoria, Guia de Gêneros, Pesquisa). Devolve HTML.
// A capa é um botão (data-album) que abre a caixa lateral do álbum (painel-album.js).
//
// Só aparecem plataformas com link direto conferido (scripts/verificar-links.js); sem link, sem botão.

const PLATAFORMAS = [
  { id: "spotify", nome: "Spotify" },
  { id: "youtubeMusic", nome: "YouTube Music", icone: "youtube-music" },
  { id: "qobuz", nome: "Qobuz" },
  { id: "appleMusic", nome: "Apple Music", icone: "apple" },
  { id: "deezer", nome: "Deezer" },
  { id: "tidal", nome: "Tidal" },
  { id: "bandcamp", nome: "Bandcamp" },
];

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Botões de streaming. `comNome`: mostra o nome da plataforma ao lado do ícone (caixa lateral).
export function botoesStreaming(ficha, { comNome = false } = {}) {
  const links = ficha.links || {};
  return PLATAFORMAS.filter((p) => links[p.id]).map((p) => {
    const rotulo = `Ouvir no ${p.nome}`;
    return `<li><a class="plat${comNome ? " plat-nome" : ""}" href="${esc(links[p.id])}" target="_blank" rel="noopener"
      aria-label="${rotulo}: ${esc(ficha.titulo)}" title="${rotulo}">
      <svg class="icone" aria-hidden="true"><use href="#i-${p.icone || p.id}"/></svg>${comNome ? `<span>${p.nome}</span>` : ""}</a></li>`;
  }).join("");
}

export function capaHtml(ficha, { lazy = true } = {}) {
  return ficha.capa
    ? `<img src="${esc(ficha.capa)}" alt="" loading="${lazy ? "lazy" : "eager"}" decoding="async">`
    : `<span class="card-sem-capa" aria-hidden="true">${esc(ficha.titulo).slice(0, 1)}</span>`;
}

// `nota`: frase opcional (ex.: do autor da Curadoria da Semana). `etiqueta`: { texto, href } —
// botão pequeno embaixo do card (ex.: o subgênero do disco na página do gênero mestre).
export function cardAlbum(ficha, { nota, etiqueta } = {}) {
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
      ${ficha.links && Object.keys(ficha.links).length ? `<ul class="card-plataformas" aria-label="Ouvir">${botoesStreaming(ficha)}</ul>` : ""}
      ${nota ? `<p class="card-nota">${esc(nota)}</p>` : ""}
      ${etiqueta ? `<a class="card-etiqueta" href="${esc(etiqueta.href)}">${esc(etiqueta.texto)}</a>` : ""}
    </article>`;
}
