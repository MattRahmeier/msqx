// Caixa lateral do álbum (especificacao.md, "Página do chart"): abre ao clicar na capa de um card.
// Mostra data de lançamento, artista, duração, links de streaming, "Sobre este álbum" (Wikipédia)
// e as notas da crítica em estrelas. A lista de faixas fica guardada na ficha, mas não aparece por
// enquanto. Tags entram quando as fichas tiverem esse campo.
// Uso: ligarPainel(elementoComCards, porId) — porId: Map id → ficha (dados.js, albuns()).
import { esc, botoesStreaming, capaHtml } from "./card-album.js";
import { creditoFonte } from "./resumo-genero.js";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// "1984-09-27" → "27 de setembro de 1984"; "1985-03" → "março de 1985"; "1985" → "1985".
function data(iso) {
  const [a, m, d] = (iso || "").split("-");
  if (!a) return null;
  if (!m) return a;
  return `${d ? `${Number(d)} de ` : ""}${MESES[Number(m) - 1]} de ${a}`;
}

let painel;
let origem; // botão que abriu o painel, para devolver o foco ao fechar

function criar() {
  painel = document.createElement("div");
  painel.className = "painel-fundo";
  painel.hidden = true;
  painel.innerHTML = `<aside class="painel" role="dialog" aria-modal="true" aria-labelledby="painel-titulo" tabindex="-1"></aside>`;
  painel.addEventListener("click", (e) => {
    if (e.target === painel || e.target.closest("[data-fechar]")) fechar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !painel.hidden) fechar();
  });
  window.addEventListener("hashchange", () => fechar(false));
  document.body.append(painel);
}

// Nota da crítica: veículo (com link para a crítica, quando houver), estrelas e a nota original.
function review(r) {
  const estrelas = String(r.estrelas).replace(".", ",");
  const nome = r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.fonte)}</a>` : esc(r.fonte);
  return `<li><span class="review-fonte">${nome}</span>
    <span class="estrelas" style="--nota:${r.estrelas}" role="img" aria-label="${estrelas} de 5 estrelas"></span>
    <span class="review-nota">${esc(r.nota)}</span></li>`;
}

function conteudo(f) {
  const dados = [
    ["Lançamento", data(f.lancamento)],
    ["Duração", f.duracao],
    ["Faixas", f.faixas?.length || null],
    ["Tipo", f.tipo],
  ].filter(([, v]) => v);
  return `
    <button type="button" class="painel-fechar" data-fechar aria-label="Fechar">×</button>
    <div class="painel-capa">${capaHtml(f, { lazy: false })}</div>
    <h2 id="painel-titulo" class="painel-titulo">${esc(f.titulo)}</h2>
    <p class="painel-artista">${esc(f.artista)}</p>
    ${dados.length ? `<dl class="painel-dados">${dados.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
    ${f.links && Object.keys(f.links).length ? `<ul class="painel-plataformas" aria-label="Ouvir">${botoesStreaming(f, { comNome: true })}</ul>` : ""}
    ${f.sobre ? `
      <h3 class="painel-secao">Sobre este álbum</h3>
      <p class="painel-sobre">${esc(f.sobre)}</p>
      <p class="painel-fonte">${creditoFonte(f.sobreFonte)}</p>` : ""}
    ${f.reviews?.length ? `
      <h3 class="painel-secao">O que a crítica disse</h3>
      <ul class="painel-reviews">${f.reviews.map(review).join("")}</ul>
      <p class="painel-fonte">Notas reunidas na <a href="${esc(f.reviews[0].via)}" target="_blank" rel="noopener">Wikipédia</a>.</p>` : ""}
    ${f.conferir ? `<p class="painel-aviso">Dados ainda em revisão.</p>` : ""}
    ${f.musicbrainz?.releaseGroup ? `<p class="painel-fonte">Dados: <a href="https://musicbrainz.org/release-group/${esc(f.musicbrainz.releaseGroup)}" target="_blank" rel="noopener">MusicBrainz</a> · capa: Cover Art Archive</p>` : ""}`;
}

export function abrirPainel(ficha, botao) {
  if (!painel) criar();
  origem = botao;
  const caixa = painel.firstElementChild;
  caixa.innerHTML = conteudo(ficha);
  caixa.scrollTop = 0;
  painel.hidden = false;
  document.body.classList.add("com-painel");
  void painel.offsetWidth; // aplica o estado inicial antes da transição
  painel.classList.add("aberto");
  caixa.focus();
}

export function fechar(devolverFoco = true) {
  if (!painel || painel.hidden) return;
  painel.classList.remove("aberto");
  painel.hidden = true;
  document.body.classList.remove("com-painel");
  if (devolverFoco) origem?.focus();
}

export function ligarPainel(el, porId) {
  el.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-album]");
    const ficha = botao && porId.get(botao.dataset.album);
    if (ficha) abrirPainel(ficha, botao);
  });
}
