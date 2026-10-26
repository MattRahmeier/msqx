// Visão de Cérebro — Fase 3 (roadmap.md). Grafo D3 de gêneros: hierarquia (pai), origens e similares.
import { generos } from "../dados.js";

export async function render(el, [generoId]) {
  const { lista } = await generos();
  const mestres = lista.filter((g) => g.mestre).map((g) => g.nome).join(", ");
  el.innerHTML = `
    <h1 class="vista-titulo">Visão de Cérebro</h1>
    <p class="vista-sub">${lista.length} gêneros carregados. Mestres: ${mestres}.</p>
    <p class="aviso">Em construção.${generoId ? ` Gênero pedido: ${generoId}.` : ""}</p>`;
}
