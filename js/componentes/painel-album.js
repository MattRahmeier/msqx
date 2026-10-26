// Caixa lateral do álbum (especificacao.md, "Página do chart"): abre ao clicar na capa de um card.
// Mostra data de lançamento, artista, duração, faixas e links de streaming. Sobre, reviews e tags
// entram quando as fichas tiverem esses campos.
// Uso: ligarPainel(elementoComCards, porId) — porId: Map id → ficha (dados.js, albuns()).
import { esc, botoesStreaming, capaHtml } from "./card-album.js";

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
    ${f.faixas?.length ? `
      <h3 class="painel-secao">Faixas</h3>
      <ol class="painel-faixas">
        ${f.faixas.map((t) => `<li><span class="faixa-n">${t.n}</span><span class="faixa-titulo">${esc(t.titulo)}</span><span class="faixa-dur">${t.duracao || ""}</span></li>`).join("")}
      </ol>` : ""}
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
