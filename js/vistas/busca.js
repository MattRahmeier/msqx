// Pesquisa (Ache o Seu Som!) — Fase 6 (roadmap.md). Busca unificada de álbuns, artistas e faixas.
import { tituloPagina } from "../componentes/titulo.js";

export async function render(el) {
  el.innerHTML = `
    ${tituloPagina("Pesquisa")}
    <p class="vista-sub">Busca por nome, gênero, data ou vibe.</p>
    <p class="aviso">Em construção.</p>`;
}
