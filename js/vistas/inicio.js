// Página inicial: marca e as quatro áreas do site, na mesma ordem da barra lateral.

const OPCOES = [
  { rota: "curadoria", icone: "i-curadoria", nome: "Curadoria da Semana", desc: "Cinco discos escolhidos por um autor convidado, toda semana." },
  { rota: "cerebro", icone: "i-cerebro", nome: "Musique Brain", desc: "O mapa dos gêneros: de onde cada estilo veio e no que se ramificou." },
  { rota: "recomendados", icone: "i-recomendados", nome: "Guia de Gêneros", desc: "As listas essenciais da internet, gênero por gênero." },
  { rota: "busca", icone: "i-busca", nome: "Pesquisa", desc: "Álbuns, artistas e faixas por nome, gênero, data ou vibe." },
];

export async function render(el) {
  el.innerHTML = `
    <section class="inicio">
      <header>
        <h1 class="inicio-marca">Musique <span>Scout</span></h1>
        <p class="inicio-sub">Curadoria Humana Organizada por IA.</p>
      </header>
      <nav class="opcoes" aria-label="Áreas do site">
        ${OPCOES.map((o) => `
          <a class="opcao" href="#/${o.rota}">
            <svg class="icone" aria-hidden="true"><use href="#${o.icone}"/></svg>
            <span class="opcao-nome">${o.nome}</span>
            <span class="opcao-desc">${o.desc}</span>
          </a>`).join("")}
      </nav>
    </section>`;
}
