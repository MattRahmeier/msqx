// Card de álbum: capa, título, artista · ano e botões de streaming com ícone.
// Usado em todas as áreas (Curadoria, Guia de Gêneros, Pesquisa). Devolve HTML.
// A capa é um botão (data-album) que abre a caixa lateral do álbum (painel-album.js).
//
// Só aparecem plataformas com link direto conferido (scripts/verificar-links.js); sem link, sem botão.

// Ordem dos botões em todo o site (cards, caixa do álbum, faixa destaque): pela popularidade do
// serviço. Assinantes no mundo no fim de 2025 (MIDiA Research): Spotify 31,4%, Apple Music 12,6%,
// YouTube Music 12,4% (o que mais cresce); no Brasil o YouTube fica bem à frente da Apple (Spotify 53%,
// YouTube Premium 24% em 2022). Depois Deezer (forte no Brasil e na França), Tidal, Qobuz (nichos de
// alta fidelidade) e Bandcamp (loja de nicho). Revisto em 27/10/2026.
const PLATAFORMAS = [
  { id: "spotify", nome: "Spotify" },
  { id: "youtubeMusic", nome: "YouTube Music", icone: "youtube-music" },
  { id: "appleMusic", nome: "Apple Music", icone: "apple" },
  { id: "deezer", nome: "Deezer" },
  { id: "tidal", nome: "Tidal" },
  { id: "qobuz", nome: "Qobuz" },
  { id: "bandcamp", nome: "Bandcamp" },
];

// Botão de copiar "Artista - Álbum" sobre a capa (em qualquer lista de cards). Mostra "Copiado"
// por um instante; sem a API de área de transferência, usa uma caixa de texto temporária.
if (typeof document !== "undefined") {
  document.addEventListener("click", async (e) => {
    const botao = e.target.closest("[data-copiar]");
    if (!botao) return;
    e.preventDefault();
    e.stopPropagation();
    const texto = botao.dataset.copiar;
    try { await navigator.clipboard.writeText(texto); }
    catch {
      const area = Object.assign(document.createElement("textarea"), { value: texto });
      document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
    }
    botao.classList.add("copiado");
    botao.setAttribute("aria-label", "Copiado");
    setTimeout(() => { botao.classList.remove("copiado"); botao.setAttribute("aria-label", `Copiar ${texto}`); }, 1400);
  });
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Botões de streaming. `comNome`: mostra o nome da plataforma ao lado do ícone (caixa lateral).
// Fora dos streamings populares (Spotify, YouTube Music, Apple Music, Deezer), o botão não oficial —
// círculo vermelho com o logo do YouTube — leva ao upload de fã (ficha.naoOficial,
// scripts/buscar-nao-oficiais.js): o álbum completo, uma faixa, outra gravação da obra ou outro vídeo do artista.
export const temOndeOuvir = (ficha) => Object.keys(ficha.links || {}).length > 0 || Boolean(ficha.naoOficial?.url);
function botaoNaoOficial(ficha) {
  const n = ficha.naoOficial;
  const rotulo = { album: "Não oficial: álbum completo no YouTube", faixa: "Não oficial: uma faixa do álbum no YouTube", obra: "Não oficial: outra gravação desta obra no YouTube", artista: "Não oficial: outro vídeo do artista no YouTube" }[n.tipo] || "Não oficial: no YouTube";
  return `<li><a class="plat nao-oficial" href="${esc(n.url)}" target="_blank" rel="noopener"
    aria-label="${rotulo}: ${esc(ficha.titulo)}" title="${rotulo} (upload de fã)">
    <svg class="icone" aria-hidden="true"><use href="#i-youtube"/></svg></a></li>`;
}
const POPULARES = ["spotify", "youtubeMusic", "appleMusic", "deezer"];

export function botoesStreaming(ficha, { comNome = false } = {}) {
  const links = ficha.links || {};
  const naoOficial = ficha.naoOficial?.url && !POPULARES.some((p) => links[p]) ? botaoNaoOficial(ficha) : "";
  return PLATAFORMAS.filter((p) => links[p.id]).map((p) => {
    const rotulo = `Ouvir no ${p.nome}`;
    return `<li><a class="plat${comNome ? " plat-nome" : ""}" href="${esc(links[p.id])}" target="_blank" rel="noopener"
      aria-label="${rotulo}: ${esc(ficha.titulo)}" title="${rotulo}">
      <svg class="icone" aria-hidden="true"><use href="#i-${p.icone || p.id}"/></svg>${comNome ? `<span>${p.nome}</span>` : ""}</a></li>`;
  }).join("") + naoOficial;
}

// Capas com imagens explícitas (violência, gore, automutilação, nudez: "capaExplicita" na ficha)
// aparecem borradas, com o aviso por cima; o primeiro toque revela (js/app.js) em vez de abrir a
// ficha. Revelada uma vez, a capa fica à mostra no resto da visita.
export const capasReveladas = new Set();
export const capaBorrada = (ficha) => ficha?.capaExplicita && !capasReveladas.has(ficha.id);

export function capaHtml(ficha, { lazy = true, aviso = true } = {}) {
  if (!ficha.capa) return `<span class="card-sem-capa" aria-hidden="true">${esc(ficha.titulo).slice(0, 1)}</span>`;
  const img = `<img src="${esc(ficha.capa)}" alt="" loading="${lazy ? "lazy" : "eager"}" decoding="async">`;
  if (!capaBorrada(ficha)) return img;
  return `<span class="capa-explicita" data-revelar="${esc(ficha.id)}">${img}${aviso ? `<span class="capa-aviso"><span>Conteúdo explícito, clique para revelar</span></span>` : ""}</span>`;
}

// `nota`: frase opcional (ex.: do autor de A Curadoria). `etiquetas`: [{ texto, href }] —
// botões pequenos embaixo do card (os outros gêneros em que o disco está).
// `editoriais`: edições de A Curadoria que citam o disco → marca laranja no canto da capa.
// `destaque`: disco em destaque no gênero (emDestaque no chart) → etiqueta "Em destaque" sobre o título.
export function cardAlbum(ficha, { nota, etiquetas = [], editoriais = [], destaque = false } = {}) {
  const ano = ficha.lancamento?.slice(0, 4);
  const capa = ficha.id
    ? `<button type="button" class="card-capa" data-album="${esc(ficha.id)}" aria-label="Detalhes de ${esc(ficha.titulo)}" aria-haspopup="dialog">${capaHtml(ficha)}</button>`
    : `<div class="card-capa">${capaHtml(ficha)}</div>`;
  const nome = `${ficha.artista} - ${ficha.titulo}`;
  return `
    <article class="card-album${destaque ? " em-destaque" : ""}">
      <div class="card-capa-area">
        ${capa}
        ${editoriais.length ? `<span class="selo-editorial" role="img" aria-label="Citado no nosso editorial: ${esc(editoriais.map((e) => e.titulo).join("; "))}" title="Citado no nosso editorial: ${esc(editoriais.map((e) => e.titulo).join("; "))}"><svg class="icone" aria-hidden="true"><use href="#i-editorial"/></svg></span>` : ""}
        <button type="button" class="copiar-nome" data-copiar="${esc(nome)}" aria-label="Copiar ${esc(nome)}" title="Copiar “${esc(nome)}”">
          <svg class="icone" aria-hidden="true"><use href="#i-copiar"/></svg>
        </button>
      </div>
      <div class="card-info">
        ${destaque ? `<p class="card-destaque">Em destaque</p>` : ""}
        <h3 class="card-titulo" title="${esc(ficha.titulo)}">${esc(ficha.titulo)}</h3>
        <p class="card-artista">${esc(ficha.artista)}${ano ? ` <span>· ${ano}</span>` : ""}</p>
      </div>
      ${temOndeOuvir(ficha) ? `<ul class="card-plataformas" aria-label="Ouvir">${botoesStreaming(ficha)}</ul>` : ""}
      ${nota ? `<p class="card-nota">${esc(nota)}</p>` : ""}
      ${etiquetas.length ? `<div class="card-etiquetas">${etiquetas.map((e) => `<a class="card-etiqueta" href="${esc(e.href)}">${esc(e.texto)}</a>`).join("")}</div>` : ""}
    </article>`;
}
