// Guia de Gêneros (Recomendados pela Internet) — Fase 5 (roadmap.md).
// #/recomendados: todos os gêneros da árvore, separados por mestre (com coroa), um card por
// gênero em ordem de proximidade · #/recomendados/<gênero>: resumo, subgêneros e os álbuns da lista.
// Na página de um gênero mestre entram também os álbuns de todos os subgêneros, cada um com um
// botão com o nome do subgênero.
// Clicar na capa abre a caixa lateral do álbum. As fotos dos gêneros ainda virão.
import { tituloPagina } from "../componentes/titulo.js";
import { chartsTranscritos, albuns, generos } from "../dados.js";
import { cardAlbum, esc } from "../componentes/card-album.js";
import { ligarPainel } from "../componentes/painel-album.js";
import { resumoGenero } from "../componentes/resumo-genero.js";
import { arvoreOrdenada, descendentes } from "../arvore.js";

const coroa = `<svg class="icone coroa" aria-hidden="true"><use href="#i-coroa"/></svg>`;
const decada = (g) => (g.decada ? `anos ${g.decada}` : "");

// Ids de álbum de cada gênero, na ordem dos charts.
function albunsPorGenero(charts) {
  const mapa = new Map();
  for (const c of charts) for (const g of c.generos) {
    const ids = mapa.get(g) || mapa.set(g, []).get(g);
    for (const a of c.albuns) if (a.album && !ids.includes(a.album)) ids.push(a.album);
  }
  return mapa;
}

// Um card por gênero, sem sublistas. Na ordem da árvore cada subgênero vem logo depois do
// gênero de onde saiu. O card mostra só a década e quantos álbuns tem.
function cardGenero(no, porGenero) {
  const n = porGenero.get(no.id)?.length;
  const meta = [decada(no), n ? `${n} álbuns` : ""].filter(Boolean).join(" · ");
  return `
    <li><a class="genero-card${n ? " com-lista" : ""}" href="#/recomendados/${no.id}">
      <span class="genero-nome">${esc(no.nome)}</span>
      <span class="genero-meta">${meta}</span>
    </a></li>`;
}

// Álbuns distintos do mestre somados aos de todos os subgêneros.
const totalMestre = (m, porGenero) => new Set([m, ...descendentes(m)].flatMap((g) => porGenero.get(g.id) || [])).size;

export async function render(el, [generoId]) {
  const [charts, gen] = await Promise.all([chartsTranscritos(), generos()]);
  const porGenero = albunsPorGenero(charts);
  const arvore = arvoreOrdenada(gen.lista);
  const genero = gen.porId.get(generoId);

  if (!genero) {
    el.innerHTML = `
      ${tituloPagina("Guia de Gêneros")}
      <p class="vista-sub">Conheça cada gênero musical com uma lista de álbuns escolhidos a dedo.</p>
      ${arvore.map((m) => `
        <section class="mestre">
          <h2 class="mestre-nome"><a href="#/recomendados/${m.id}">${coroa}${esc(m.nome)}</a>
            <span class="genero-meta">${[decada(m), totalMestre(m, porGenero) ? `${totalMestre(m, porGenero)} álbuns` : ""].filter(Boolean).join(" · ")}</span></h2>
          <ul class="generos">${descendentes(m).map((g) => cardGenero(g, porGenero)).join("")}</ul>
        </section>`).join("")}`;
    return;
  }

  const no = [...arvore, ...arvore.flatMap(descendentes)].find((g) => g.id === genero.id);
  const caminho = [];
  for (let g = genero; g; g = gen.porId.get(g.pai)) caminho.unshift(g);
  const { porId } = await albuns();
  // Álbuns do próprio gênero e, no mestre, os de cada subgênero (na ordem da árvore, sem repetir),
  // com a etiqueta do subgênero.
  const itens = (porGenero.get(genero.id) || []).map((id) => ({ ficha: porId.get(id) }));
  if (genero.mestre) {
    const vistos = new Set(itens.map((i) => i.ficha?.id));
    for (const sub of descendentes(no)) {
      for (const id of porGenero.get(sub.id) || []) {
        if (vistos.has(id)) continue;
        vistos.add(id);
        itens.push({ ficha: porId.get(id), etiqueta: { texto: sub.nome, href: `#/recomendados/${sub.id}` } });
      }
    }
  }
  const fichas = itens.filter((i) => i.ficha);

  el.innerHTML = `
    <nav class="voltar" aria-label="Caminho"><a href="#/recomendados">Guia de Gêneros</a>${caminho.slice(0, -1).map((g) => ` › <a href="#/recomendados/${g.id}">${esc(g.nome)}</a>`).join("")}</nav>
    ${tituloPagina(`${genero.mestre ? coroa : ""}${esc(genero.nome)}`, genero.pai ? `recomendados/${genero.pai}` : "recomendados")}
    <div class="vista-resumo">${resumoGenero(genero, { rota: "recomendados" }) || (genero.resumoPendente ? `<p class="resumo-genero">Resumo em preparação.</p>` : "")}</div>
    ${descendentes(no).length ? `
      <h2 class="secao-titulo">Subgêneros</h2>
      <ul class="chips">${descendentes(no).map((f) => `<li><a href="#/recomendados/${f.id}">${esc(f.nome)}</a></li>`).join("")}</ul>` : ""}
    ${fichas.length ? `
      <h2 class="secao-titulo">Álbuns essenciais</h2>
      <div class="grade-albuns">${fichas.map((i) => cardAlbum(i.ficha, { etiqueta: i.etiqueta })).join("")}</div>
      <p class="disclaimer">Listas curadas por usuários da internet. Podem não refletir a totalidade do gênero, mas são um bom ponto de partida.</p>`
    : `<p class="aviso">A lista de álbuns deste gênero ainda está sendo montada.</p>`}`;
  if (fichas.length) ligarPainel(el.querySelector(".grade-albuns"), porId);
}
