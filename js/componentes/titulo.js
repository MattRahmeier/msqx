// Título da página com as setas de navegação à esquerda. `voltar`: rota da página anterior na
// hierarquia (área → início; gênero → gênero mestre ou o Guia). `subir`: rota do gênero logo acima
// (seta para cima, só nos subgêneros). `html` já vem escapado.
export function tituloPagina(html, voltar = "inicio", { subir, rotuloVoltar = "Voltar", rotuloSubir = "Subir um nível" } = {}) {
  const seta = (rota, icone, rotulo) => `<a class="voltar-seta" href="#/${rota}" aria-label="${rotulo}" title="${rotulo}"><svg class="icone" aria-hidden="true"><use href="#i-${icone}"/></svg></a>`;
  return `
    <h1 class="vista-titulo">
      <span class="vista-setas">${seta(voltar, "voltar", rotuloVoltar)}${subir ? seta(subir, "subir", rotuloSubir) : ""}</span>
      <span>${html}</span>
    </h1>`;
}
