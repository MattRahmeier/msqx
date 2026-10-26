// Roteamento por hash entre as quatro áreas (especificacao.md). Cada área é um módulo em js/vistas/
// que exporta `render(elemento, parametros)`.

const ROTAS = {
  cerebro: () => import("./vistas/cerebro.js"),
  curadoria: () => import("./vistas/curadoria.js"),
  recomendados: () => import("./vistas/recomendados.js"),
  busca: () => import("./vistas/busca.js"),
};
const PADRAO = "curadoria";

const conteudo = document.getElementById("conteudo");

async function navegar() {
  // #/cerebro/heavy-metal → rota "cerebro", parâmetros ["heavy-metal"]
  const [rota, ...parametros] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!ROTAS[rota]) return void (location.hash = `#/${PADRAO}`);

  for (const a of document.querySelectorAll("[data-rota]")) {
    if (a.dataset.rota === rota) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }

  conteudo.replaceChildren();
  try {
    const vista = await ROTAS[rota]();
    await vista.render(conteudo, parametros.map(decodeURIComponent));
  } catch (e) {
    conteudo.innerHTML = `<p class="aviso">Não foi possível carregar esta área.</p>`;
    console.error(e);
  }
  conteudo.focus({ preventScroll: true });
}

window.addEventListener("hashchange", navegar);
navegar();
