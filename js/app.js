// Roteamento por hash entre as quatro áreas (especificacao.md). Cada área é um módulo em js/vistas/
// que exporta `render(elemento, parametros)`.
import { capasReveladas } from "./componentes/card-album.js";

const ROTAS = {
  inicio: () => import("./vistas/inicio.js"),
  trackmap: () => import("./vistas/cerebro.js"),
  curadoria: () => import("./vistas/curadoria.js"),
  recomendados: () => import("./vistas/recomendados.js"),
  busca: () => import("./vistas/busca.js"),
};
const PADRAO = "inicio";

const conteudo = document.getElementById("conteudo");

async function navegar() {
  // #/trackmap/heavy-metal → rota "trackmap", parâmetros ["heavy-metal"]
  const [rota, ...parametros] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  // Endereços antigos do TrackMap (#/cerebro/…) continuam funcionando.
  if (rota === "cerebro") return void location.replace(`#/${["trackmap", ...parametros].join("/")}`);
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
  // Voltar a uma página já vista (ex.: da página de um gênero para a lista do Guia de Gêneros)
  // devolve a rolagem de onde a pessoa saiu; pelo menu da barra, a página abre do começo.
  window.scrollTo(0, viaMenu ? 0 : rolagem.get(location.hash) || 0);
  viaMenu = false;
}

// Rolagem de cada endereço no momento em que a pessoa saiu dele. O navegador não guarda isso
// sozinho porque a página inteira é redesenhada a cada troca de rota.
history.scrollRestoration = "manual";
const rolagem = new Map();
let viaMenu = false;
document.addEventListener("click", (e) => { if (e.target.closest("[data-rota], .marca, .marca-linha")) viaMenu = true; }, true);

// Regra do site: todo link para fora (streaming, YouTube, Discogs, Wikipédia…) abre em outra aba,
// mesmo que o HTML que o criou tenha esquecido o target.
// No Android, os links dos serviços de streaming e do YouTube abrem direto no app instalado (link
// "intent:" com o pacote do app), sem abrir uma aba do navegador; sem o app, o Android segue para o
// endereço normal (browser_fallback_url). Só vale com o site na janela principal de um navegador:
// dentro de um iframe (a cópia publicada como Artifact) ou de um WebView (navegador interno de outro
// app), o "intent:" não abre nada e cai numa página de erro; ali o link segue normal, em outra aba, e
// o Android ainda pode levá-lo ao app. No iPhone, o próprio sistema leva ao app quando o serviço tem o
// app instalado (Universal Links), então o link fica como está.
const APPS_ANDROID = {
  "music.youtube.com": "com.google.android.apps.youtube.music",
  "www.youtube.com": "com.google.android.youtube", "youtube.com": "com.google.android.youtube", "m.youtube.com": "com.google.android.youtube", "youtu.be": "com.google.android.youtube",
  "open.spotify.com": "com.spotify.music",
  "www.deezer.com": "deezer.android.app", "deezer.com": "deezer.android.app",
  "music.apple.com": "com.apple.android.music",
  "tidal.com": "com.aspiro.tidal", "listen.tidal.com": "com.aspiro.tidal",
  "open.qobuz.com": "com.qobuz.music", "play.qobuz.com": "com.qobuz.music",
};
const android = /Android/i.test(navigator.userAgent) && !/;\s*wv\)/.test(navigator.userAgent) && window.top === window;
const linkDoApp = (a) => `intent://${a.host}${a.pathname}${a.search}#Intent;scheme=https;package=${APPS_ANDROID[a.hostname]};S.browser_fallback_url=${encodeURIComponent(a.href)};end`;

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || !/^https?:$/.test(a.protocol) || a.origin === location.origin) return;
  if (android && APPS_ANDROID[a.hostname]) {
    // O endereço da web fica guardado; o toque segue para o app, na mesma aba (sem aba nova vazia).
    a.dataset.web = a.href;
    a.href = linkDoApp(a);
    a.removeAttribute("target");
    setTimeout(() => { a.href = a.dataset.web; });
    return;
  }
  a.target = "_blank";
  a.rel = "noopener";
}, true);

// Capa explícita borrada (capaHtml em card-album.js): o primeiro toque só revela — não abre a ficha
// nem segue o link — e revela as outras cópias da mesma capa na página.
document.addEventListener("click", (e) => {
  const capa = e.target.closest("[data-revelar]");
  if (!capa) return;
  e.preventDefault();
  e.stopPropagation();
  capasReveladas.add(capa.dataset.revelar);
  for (const c of document.querySelectorAll(`[data-revelar="${CSS.escape(capa.dataset.revelar)}"]`)) {
    c.querySelector(".capa-aviso")?.remove();
    c.classList.add("revelada");
    c.removeAttribute("data-revelar");
  }
}, true);

// Caixas de informação ("i", .info-dica) fecham ao tocar fora delas.
document.addEventListener("click", (e) => {
  for (const d of document.querySelectorAll(".info-dica[open]")) if (!d.contains(e.target)) d.open = false;
});

window.addEventListener("hashchange", (e) => {
  rolagem.set(new URL(e.oldURL).hash, window.scrollY);
  navegar();
});
navegar();
