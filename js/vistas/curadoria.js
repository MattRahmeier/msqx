// Curadoria da Semana — Fase 4 (roadmap.md). Edição mais recente de data/curadorias/ + arquivo.
import { tituloPagina } from "../componentes/titulo.js";
import { curadorias } from "../dados.js";

export async function render(el) {
  const edicoes = await curadorias();
  el.innerHTML = `
    ${tituloPagina("Curadoria da Semana")}
    <p class="vista-sub">${edicoes.length ? `${edicoes.length} edição(ões) publicadas.` : "Nenhuma edição publicada ainda."}</p>
    <p class="aviso">Em construção.</p>`;
}
