// A Curadoria — Fase 4 (roadmap.md). Edição mais recente de data/curadorias/ (cuja data já chegou)
// e, no fim, o arquivo das anteriores. Cada edição é um editorial sobre algumas faixas: no topo, a
// lista das faixas como uma playlist (cada linha leva à faixa); em cada uma, um "player" (capa + nome da faixa + links para ouvir, que
// abrem em outra aba sem tirar a pessoa da leitura, e "Tocar aqui", que embute o vídeo da faixa no
// YouTube) seguido do texto do autor. Tocar na capa abre a ficha do álbum (painel-album.js).
// #/curadoria/<id da edição> abre uma edição do arquivo.
import { tituloPagina } from "../componentes/titulo.js";
import { curadorias, albuns, generos } from "../dados.js";
import { botoesStreaming, capaHtml, esc } from "../componentes/card-album.js";
import { ligarPainel } from "../componentes/painel-album.js";

const data = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

// "Tocar aqui": o vídeo da faixa no YouTube (faixa inteira, sem login), embutido logo abaixo do
// quadro; tocar de novo fecha o vídeo e o quadro volta ao normal. Embaixo do vídeo, à direita, o link
// para abrir no YouTube, caso o dono do vídeo não permita tocar fora do site.
// `video` da faixa (ex.: upload de fã, quando o disco não está no catálogo oficial) vale antes do
// YouTube Music.
const videoDe = (links, video) => (video?.url || links.youtubeMusic)?.match(/[?&]v=([\w-]+)/)?.[1];
function embutir(links, autoplay = false, extra) {
  const video = videoDe(links, extra);
  if (!video) return "";
  return `<iframe class="video" src="https://www.youtube-nocookie.com/embed/${video}${autoplay ? "?autoplay=1" : ""}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="Player do YouTube"></iframe>
    <a class="player-abrir" href="https://www.youtube.com/watch?v=${video}" target="_blank" rel="noopener">Abrir no YouTube</a>`;
}

// Marcação do texto do autor: _palavra_ → itálico (estrangeirismos e neologismos);
// [texto](g:<gênero>) → link para a página do gênero no Guia de Gêneros (só se o gênero existir);
// [título](a:<ficha>) → nome de disco que abre a ficha do álbum (só se a ficha existir).
function formatar(texto, gen, porId) {
  return esc(texto)
    .replace(/\[([^\]]+)\]\(a:([a-z0-9-]+)\)/g, (_, rotulo, id) => (porId.has(id) ? `<button type="button" class="curadoria-disco" data-album="${id}" aria-haspopup="dialog">${rotulo}</button>` : `<em>${rotulo}</em>`))
    .replace(/\[([^\]]+)\]\(g:([a-z0-9-]+)\)/g, (_, rotulo, g) => (gen.porId.has(g) ? `<a class="curadoria-genero" href="#/recomendados/${g}">${rotulo}</a>` : rotulo))
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

// "Sobre o autor", no fim da edição: foto, nome, bio e redes (ícones com link).
const REDES = { instagram: "Instagram", github: "GitHub" };
function autorHtml(a) {
  if (!a?.nome) return "";
  const redes = (a.redes || []).filter((r) => REDES[r.rede] && r.url);
  return `
    <aside class="autor" aria-labelledby="autor-titulo">
      ${a.foto ? `<img class="autor-foto" src="${esc(a.foto)}" alt="Foto de ${esc(a.nome)}" loading="lazy">` : ""}
      <div class="autor-texto">
        <h2 class="autor-rotulo" id="autor-titulo">Sobre o autor</h2>
        <p class="autor-nome">${esc(a.nome)}</p>
        ${a.bio ? `<p class="autor-bio">${esc(a.bio)}</p>` : ""}
        ${redes.length ? `<ul class="autor-redes">${redes.map((r) => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="${REDES[r.rede]} de ${esc(a.nome)}" title="${REDES[r.rede]}"><svg class="icone" aria-hidden="true"><use href="#i-${r.rede}"/></svg></a></li>`).join("")}</ul>` : ""}
      </div>
    </aside>`;
}

// Guia ao lado (abaixo, no celular): o histórico de tudo o que já saiu em A Curadoria, separado por
// tipo ("tipo" da edição: editorial, entrevista ou noticia; sem ele, editorial). O que está aberto
// fica marcado; os tipos ainda sem publicações aparecem como "em breve".
const TIPOS = {
  editorial: { um: "Editorial", varios: "Editoriais" },
  entrevista: { um: "Entrevista", varios: "Entrevistas" },
  noticia: { um: "Notícia", varios: "Notícias" },
};
function arquivoHtml(publicadas, atual, porId) {
  const grupo = (tipo) => publicadas.filter((e) => (e.tipo || "editorial") === tipo);
  const item = (e) => {
    const capa = porId.get(e.faixas?.[0]?.album)?.capa;
    return `<li><a href="#/curadoria/${esc(e.id)}"${e === atual ? ' aria-current="page"' : ""}>
      ${capa ? `<img src="${esc(capa)}" alt="" loading="lazy">` : `<span class="arquivo-sem-capa"></span>`}
      <span><strong>${esc(e.titulo)}</strong><span>#${e.numero} · ${data(e.publicacao)}</span></span></a></li>`;
  };
  return `
    <aside class="curadoria-arquivo" aria-label="Histórico de A Curadoria">
      <h2 class="arquivo-titulo">Histórico</h2>
      ${Object.entries(TIPOS).map(([tipo, t]) => {
        const lista = grupo(tipo);
        return `<section class="arquivo-grupo">
          <h3>${t.varios} <span>${lista.length}</span></h3>
          ${lista.length ? `<ul>${lista.map(item).join("")}</ul>` : `<p class="arquivo-vazio">Em breve.</p>`}
        </section>`;
      }).join("")}
    </aside>`;
}

const ICONE_TOCAR = `<svg class="icone" aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>`;
const ICONE_FECHAR = `<svg class="icone" aria-hidden="true" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>`;

const duracaoDe = (t, ficha) => (t.faixa ? ficha?.faixas?.find((x) => x.titulo.toLowerCase().replace(/[’']/g, "'") === t.faixa.toLowerCase().replace(/[’']/g, "'"))?.duracao : ficha?.duracao);

// Edições de álbuns ("formato": "albuns"): cada item é um disco, sem "faixa". "posicao" é o número
// dado pelo autor (ex.: uma contagem de 5 a 1); "grupo" abre uma seção (ex.: menções honrosas), e
// os itens dela ficam sem número, com o louro de honra no lugar.
const tituloDe = (t) => t.faixa || t.albumTitulo;
const numeroDe = (t, i) => (t.grupo ? "" : String(t.posicao ?? i + 1));
const LOURO = `<svg class="icone louro" aria-hidden="true"><use href="#i-louro"/></svg>`;
const abreGrupo = (faixas, i) => faixas[i].grupo && faixas[i].grupo !== faixas[i - 1]?.grupo;

// Lista das faixas no topo, como uma playlist: número, capa pequena, faixa e artista, álbum e
// duração. Tocar numa linha rola até a faixa. Acima, os links da playlist da edição (Spotify e
// YouTube Music), quando existem.
function playlistHtml(edicao, porId) {
  const servicos = [["spotify", "Spotify", "spotify"], ["youtubeMusic", "YouTube Music", "youtube-music"]].filter(([k]) => edicao.playlists?.[k]);
  return `
    <section class="playlist" aria-label="Faixas desta edição">
      ${servicos.length ? `<div class="playlist-ouvir">${servicos.map(([k, nome, icone]) => `<a class="plat plat-nome" href="${esc(edicao.playlists[k])}" target="_blank" rel="noopener"><svg class="icone" aria-hidden="true"><use href="#i-${icone}"/></svg><span>Playlist no ${nome}</span></a>`).join("")}</div>` : ""}
      <div class="playlist-cabeca" aria-hidden="true"><span>#</span><span>${edicao.formato === "albuns" ? "Álbum" : "Título"}</span><span>${edicao.formato === "albuns" ? "Ano" : "Álbum"}</span><span>Duração</span></div>
      <ol class="playlist-faixas">
        ${edicao.faixas.map((t, i) => {
          const f = porId.get(t.album);
          return `${abreGrupo(edicao.faixas, i) ? `<li class="playlist-grupo">${LOURO}${esc(t.grupo)}</li>` : ""}<li><button type="button" data-salto="${i + 1}" aria-label="Ir para ${esc(tituloDe(t))}, de ${esc(t.artista)}">
            <span class="playlist-n">${numeroDe(t, i) || LOURO}</span>
            <span class="playlist-titulo">${f?.capa ? `<img src="${esc(f.capa)}" alt="" loading="lazy">` : `<span class="playlist-sem-capa"></span>`}<span><strong>${esc(tituloDe(t))}</strong><span>${esc(t.artista)}</span></span></span>
            <span class="playlist-album">${t.faixa ? esc(t.albumTitulo) : esc(f?.lancamento?.slice(0, 4) || "")}</span>
            <span class="playlist-duracao">${esc(duracaoDe(t, f) || "")}</span>
          </button></li>`;
        }).join("")}
      </ol>
    </section>`;
}

function faixaHtml(t, i, ficha, gen, porId, faixas) {
  const links = Object.keys(t.links || {}).length ? t.links : ficha?.links || {};
  const ano = ficha?.lancamento?.slice(0, 4);
  const duracao = duracaoDe(t, ficha);
  const capa = ficha
    ? `<button type="button" class="player-capa" data-album="${esc(ficha.id)}" aria-label="Ficha do álbum ${esc(t.albumTitulo)}" aria-haspopup="dialog">${capaHtml(ficha, { lazy: i > 0 })}</button>`
    : `<div class="player-capa"><span class="card-sem-capa" aria-hidden="true">${esc(t.albumTitulo).slice(0, 1)}</span></div>`;
  const tocar = videoDe(links, t.video);
  // Gêneros do álbum (dos charts e dos estilos do Wikidata/MusicBrainz), com link para o Guia de Gêneros.
  const generosDoAlbum = [...new Set([...(ficha?.generos || []), ...(ficha?.estilos || [])])].filter((g) => gen.porId.has(g));
  return `${abreGrupo(faixas, i) ? `<h2 class="curadoria-grupo">${LOURO}${esc(t.grupo)}</h2>` : ""}
    <section class="curadoria-faixa" id="faixa-${i + 1}" aria-labelledby="faixa-${i + 1}-titulo">
      <div class="player">
        ${capa}
        <div class="player-info">
          <p class="player-numero">${numeroDe(t, i) ? numeroDe(t, i).padStart(2, "0") : `${LOURO}<span class="visualmente-oculto">${esc(t.grupo)}</span>`}</p>
          <h3 class="player-faixa" id="faixa-${i + 1}-titulo">${esc(tituloDe(t))}</h3>
          <p class="player-album">${esc(t.artista)}${t.faixa ? ` · <span>${esc(t.albumTitulo)}${ano ? ` (${ano})` : ""}</span>` : ano ? ` · <span>${ano}</span>` : ""}${duracao ? ` · <span class="player-duracao">${esc(duracao)}</span>` : ""}</p>
          ${generosDoAlbum.length ? `<ul class="player-generos" aria-label="Gêneros do álbum">${generosDoAlbum.map((g) => `<li><a href="#/recomendados/${g}">${esc(gen.porId.get(g).nome)}</a></li>`).join("")}</ul>` : ""}
          <div class="player-acoes">
            ${tocar ? `<button type="button" class="player-tocar" data-tocar="${i}" aria-pressed="false">${ICONE_TOCAR}<span>Tocar aqui</span></button>` : ""}
            ${Object.keys(links).length ? `<ul class="player-links" aria-label="Ouvir ${esc(tituloDe(t))}">${botoesStreaming({ links, titulo: tituloDe(t) })}</ul>` : ""}
          </div>
        </div>
      </div>
      ${tocar ? `<div class="player-embutido" hidden data-embutido="${i}"></div>` : ""}
      <div class="curadoria-texto">
        ${t.texto.map((p) => `<p>${formatar(p, gen, porId)}</p>`).join("")}
        ${t.outras?.length ? `<p class="curadoria-outras"><strong>Outras faixas de destaque:</strong> ${t.outras.map(esc).join(", ")}</p>` : ""}
      </div>
    </section>`;
}

export async function render(el, [edicaoId]) {
  const [todas, { porId }, gen] = await Promise.all([curadorias(), albuns(), generos()]);
  const hoje = new Date().toISOString().slice(0, 10);
  const publicadas = todas.filter((e) => e.publicacao <= hoje).sort((a, b) => b.publicacao.localeCompare(a.publicacao));
  const edicao = publicadas.find((e) => e.id === edicaoId) || publicadas[0];

  if (!edicao) {
    el.innerHTML = `${tituloPagina("A Curadoria")}<p class="vista-sub">Nenhuma edição publicada ainda.</p>`;
    return;
  }
  el.innerHTML = `
    <div class="curadoria-pagina">
      ${tituloPagina("A Curadoria")}
      <div class="curadoria-colunas">
        <article class="curadoria">
          <header class="curadoria-cabeca">
            <p class="curadoria-edicao">${esc(TIPOS[edicao.tipo || "editorial"].um)} #${edicao.numero} · ${data(edicao.publicacao)}</p>
            <h2 class="curadoria-titulo">${esc(edicao.titulo)}</h2>
            ${edicao.autor?.nome ? `<p class="curadoria-autor">por ${esc(edicao.autor.nome)}</p>` : ""}
          </header>
          ${edicao.introducao?.length ? `<div class="curadoria-texto curadoria-intro">${edicao.introducao.map((p) => `<p>${formatar(p, gen, porId)}</p>`).join("")}</div>` : ""}
          ${playlistHtml(edicao, porId)}
          ${edicao.faixas.map((t, i) => faixaHtml(t, i, porId.get(t.album), gen, porId, edicao.faixas)).join("")}
          ${autorHtml(edicao.autor)}
        </article>
        ${arquivoHtml(publicadas, edicao, porId)}
      </div>
    </div>`;

  const artigo = el.querySelector(".curadoria");
  ligarPainel(artigo, porId);
  artigo.addEventListener("click", (e) => {
    // Os atalhos rolam até a faixa (âncoras com # mexeriam na rota do site).
    const salto = e.target.closest("[data-salto]");
    if (salto) {
      const alvo = artigo.querySelector(`#faixa-${salto.dataset.salto}`);
      alvo.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      alvo.querySelector("h3").focus({ preventScroll: true });
      return;
    }
    const tocar = e.target.closest("[data-tocar]");
    if (tocar) {
      const i = Number(tocar.dataset.tocar);
      const caixa = artigo.querySelector(`[data-embutido="${i}"]`);
      const abrir = caixa.hidden;
      // Fechar tira o vídeo da página (o som para) e o quadro volta ao normal.
      caixa.innerHTML = abrir ? embutir(Object.keys(edicao.faixas[i].links || {}).length ? edicao.faixas[i].links : porId.get(edicao.faixas[i].album)?.links || {}, true, edicao.faixas[i].video) : "";
      caixa.hidden = !abrir;
      tocar.setAttribute("aria-pressed", String(abrir));
      tocar.innerHTML = abrir ? `${ICONE_FECHAR}<span>Fechar vídeo</span>` : `${ICONE_TOCAR}<span>Tocar aqui</span>`;
    }
  });
  artigo.querySelectorAll(".player-faixa").forEach((h) => h.setAttribute("tabindex", "-1"));
}
