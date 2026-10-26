// Guia de Gêneros (Recomendados pela Internet) — Fase 5 (roadmap.md).
// #/recomendados: charts transcritos · #/recomendados/<chart>: grade de cards de álbum do chart.
// Clicar na capa abre a caixa lateral do álbum. Os cards de gênero com foto ainda virão.
import { chartsTranscritos, albuns, generos } from "../dados.js";
import { cardAlbum, esc } from "../componentes/card-album.js";
import { ligarPainel } from "../componentes/painel-album.js";

export async function render(el, [chartId]) {
  const [lista, gen] = await Promise.all([chartsTranscritos(), generos()]);
  const nomesGeneros = (c) => c.generos.map((g) => gen.porId.get(g)?.nome || g).join(", ");
  const chart = lista.find((c) => c.id === chartId);

  if (!chart) {
    el.innerHTML = `
      <h1 class="vista-titulo">Guia de Gêneros</h1>
      <p class="vista-sub">As listas essenciais do /mu/, gênero por gênero.</p>
      <ul class="lista-charts">
        ${lista.map((c) => `
          <li><a class="chart-link" href="#/recomendados/${c.id}">
            <span class="chart-link-nome">${esc(nomesGeneros(c))}</span>
            <span class="chart-link-sub">${c.albuns.filter((a) => a.album).length} álbuns</span>
          </a></li>`).join("")}
      </ul>`;
    return;
  }

  const { porId } = await albuns();
  // Sem ficha (não identificado no chart): não entra na grade.
  const fichas = chart.albuns.map((a) => a.album && (porId.get(a.album) || { titulo: a.titulo, artista: a.artista })).filter(Boolean);
  el.innerHTML = `
    <a class="voltar" href="#/recomendados">← Guia de Gêneros</a>
    <h1 class="vista-titulo">${esc(nomesGeneros(chart))}</h1>
    <p class="vista-sub">${esc(chart.titulo)} · ${fichas.length} álbuns</p>
    <p class="disclaimer">Listas curadas por usuários da internet. Podem não refletir a totalidade do gênero, mas são um bom ponto de partida.</p>
    <div class="grade-albuns">${fichas.map((f) => cardAlbum(f)).join("")}</div>`;
  ligarPainel(el.querySelector(".grade-albuns"), porId);
}
