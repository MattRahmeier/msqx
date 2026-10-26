// Guia de Gêneros (Recomendados pela Internet) — Fase 5 (roadmap.md). Cards de gênero e página de cada chart.
import { charts } from "../dados.js";

export async function render(el) {
  const lista = await charts();
  el.innerHTML = `
    <h1 class="vista-titulo">Guia de Gêneros</h1>
    <p class="vista-sub">${lista.length} charts das Essential Charts do /mu/ indexados.</p>
    <p class="aviso">Em construção.</p>`;
}
