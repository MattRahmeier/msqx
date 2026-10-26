// Título da página com a seta de voltar à esquerda. `voltar`: rota da página anterior na
// hierarquia (área → início; gênero → gênero de cima ou o Guia). `html` já vem escapado.
export function tituloPagina(html, voltar = "inicio") {
  return `
    <h1 class="vista-titulo">
      <a class="voltar-seta" href="#/${voltar}" aria-label="Voltar"><svg class="icone" aria-hidden="true"><use href="#i-voltar"/></svg></a>
      <span>${html}</span>
    </h1>`;
}
