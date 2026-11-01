// Caixa lateral do álbum (especificacao.md, "Página do chart"): abre ao clicar na capa de um card.
// Mostra data de lançamento, artista, duração, a faixa destaque, "Sobre este álbum" (Wikipédia),
// as notas da crítica em estrelas, os links de streaming do álbum e o registro mestre no Discogs. A lista de faixas fica guardada na ficha, mas não aparece por
// enquanto. Os descritores do disco (clima, som, voz, letra) aparecem como etiquetas que levam à
// Pesquisa por aquele descritor.
// Uso: ligarPainel(elementoComCards, porId) — porId: Map id → ficha (dados.js, albuns()).
import { esc, botoesStreaming, capaHtml, temOndeOuvir } from "./card-album.js";
import { creditos } from "./resumo-genero.js";
import { citacoesEditoriais, descritores } from "../dados.js";

// Edições de A Curadoria que citam cada disco e o vocabulário de descritores (carregados uma vez).
const [citados, desc] = await Promise.all([citacoesEditoriais(), descritores()]);
// Ao lado do título, um "i" abre a caixa que explica de onde vêm os descritores.
function descritoresHtml(f) {
  const ds = (f.descritores || []).map((d) => desc.porId.get(d)).filter(Boolean);
  if (!ds.length) return "";
  return `
    <div class="painel-secao-linha">
      <h3 class="painel-secao">Descritores</h3>
      <details class="info-dica">
        <summary aria-label="Sobre os descritores" title="Sobre os descritores"><span aria-hidden="true">i</span></summary>
        <p class="info-dica-caixa">Características apontadas por usuários da internet.</p>
      </details>
    </div>
    <ul class="chips painel-descritores">${ds.map((d) => `<li><a href="#/busca/${encodeURIComponent(d.nome)}">${esc(d.nome)}</a></li>`).join("")}</ul>`;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// "1984-09-27" → "27 de Setembro de 1984"; "1985-03" → "Março de 1985"; "1985" → "1985".
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
    <span class="review-nota"${r.votos ? ` title="Média de ${r.votos} avaliações"` : ""}>${esc(r.nota)}</span></li>`;
}

// Faixa destaque (scripts/buscar-destaques.js): título, duração, o critério da escolha e os links
// para ouvir a faixa, com os mesmos ícones dos botões de streaming.
function destaque(d) {
  const links = d.links && Object.keys(d.links).length
    ? `<ul class="card-plataformas destaque-links" aria-label="Ouvir a faixa">${botoesStreaming({ titulo: d.titulo, links: d.links })}</ul>` : "";
  return `
    <div class="painel-destaque">
      <div class="destaque-texto">
        <span class="destaque-rotulo">Faixa destaque</span>
        <span class="destaque-faixa">${esc(d.titulo)}${d.duracao ? ` <span class="destaque-dur">${esc(d.duracao)}</span>` : ""}</span>
        <span class="destaque-criterio">${esc(d.criterio.charAt(0).toUpperCase() + d.criterio.slice(1))}</span>
      </div>
      ${links}
    </div>`;
}

// Nome do site de uma imagem (CDNs conhecidos viram o nome do serviço).
const SITES = { "bcbits.com": "Bandcamp", "bandcamp.com": "Bandcamp", "dzcdn.net": "Deezer", "mzstatic.com": "Apple Music" };
function nomeSite(url) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return Object.entries(SITES).find(([d]) => host === d || host.endsWith("." + d))?.[1] || host;
}

// Rodapé: de onde vêm os dados e a capa (Cover Art Archive, ou o site de onde ela foi tirada).
function rodape(f) {
  const dados = f.musicbrainz?.releaseGroup
    ? `Dados: <a href="https://musicbrainz.org/release-group/${esc(f.musicbrainz.releaseGroup)}" target="_blank" rel="noopener">MusicBrainz</a>` : "";
  let capa = "";
  if (f.capaFonte) {
    try { capa = `capa: <a href="${esc(f.capaFonte)}" target="_blank" rel="noopener">${esc(nomeSite(f.capaFonte))}</a>`; } catch { capa = ""; }
  } else if (f.capa) capa = "capa: Cover Art Archive";
  const partes = [dados, capa].filter(Boolean);
  return partes.length ? `<p class="painel-fonte">${partes.join(" · ")}</p>` : "";
}

function conteudo(f) {
  const dados = [
    ["Lançamento", data(f.lancamento)],
    ["Duração", f.duracao],
    ["Faixas", f.faixas?.length || null],
    ["Gravadora", f.gravadora],
  ].filter(([, v]) => v);
  return `
    <button type="button" class="painel-fechar" data-fechar aria-label="Fechar">×</button>
    <div class="painel-capa card-capa-area">${capaHtml(f, { lazy: false })}
      <button type="button" class="copiar-nome" data-copiar="${esc(`${f.artista} - ${f.titulo}`)}" aria-label="Copiar ${esc(`${f.artista} - ${f.titulo}`)}" title="Copiar nome do disco"><svg class="icone" aria-hidden="true"><use href="#i-copiar"/></svg></button></div>
    <h2 id="painel-titulo" class="painel-titulo">${esc(f.titulo)}</h2>
    <p class="painel-artista">${esc(f.artista)}</p>
    ${dados.length ? `<dl class="painel-dados">${dados.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
    ${f.destaque ? destaque(f.destaque) : ""}
    ${descritoresHtml(f)}
    ${f.sobre ? `
      <h3 class="painel-secao">Sobre este álbum</h3>
      <p class="painel-sobre">${esc(f.sobre)}</p>
      <p class="painel-fonte">${creditos([f.sobreFonte])}</p>` : ""}
    ${citados.get(f.id)?.length ? `
      <h3 class="painel-secao">Citado no editorial</h3>
      <ul class="painel-editoriais">${citados.get(f.id).map((e) => `<li><a href="#/curadoria/${esc(e.id)}"><svg class="icone" aria-hidden="true"><use href="#i-editorial"/></svg><span>${esc(e.titulo)}</span><small>Editorial #${e.numero}</small></a></li>`).join("")}</ul>` : ""}
    ${f.reviews?.length ? `
      <h3 class="painel-secao">O que a crítica disse</h3>
      <ul class="painel-reviews">${f.reviews.map(review).join("")}</ul>
      ${f.reviews.some((r) => r.via) ? `<p class="painel-fonte">Notas da crítica reunidas na <a href="${esc(f.reviews.find((r) => r.via).via)}" target="_blank" rel="noopener">Wikipédia em inglês</a>.</p>` : ""}` : ""}
    ${temOndeOuvir(f) ? `
      <h3 class="painel-secao">Ouça o álbum</h3>
      <ul class="painel-plataformas" aria-label="Ouvir">${botoesStreaming(f, { comNome: true })}</ul>` : ""}
    ${f.discogs ? `
      <a class="plat plat-nome botao-discogs" href="${esc(f.discogs)}" target="_blank" rel="noopener" aria-label="Ver ${esc(f.titulo)} no Discogs">
        <svg class="icone" aria-hidden="true"><use href="#i-discogs"/></svg><span>Discogs</span></a>` : ""}
    ${f.conferir ? `<p class="painel-aviso">Dados ainda em revisão.</p>` : ""}
    ${rodape(f)}`;
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
