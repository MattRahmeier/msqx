// Curadoria da Semana — Fase 4 (roadmap.md). Edição mais recente de data/curadorias/ + arquivo.
import { curadorias } from "../dados.js";

export async function render(el) {
  const edicoes = await curadorias();
  el.innerHTML = `
    <h1 class="vista-titulo">Curadoria da Semana</h1>
    <p class="vista-sub">${edicoes.length ? `${edicoes.length} edição(ões) publicadas.` : "Nenhuma edição publicada ainda."}</p>
    <p class="aviso">Em construção.</p>`;
}
