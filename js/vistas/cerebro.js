// TrackMap (Visão de Cérebro) — Fase 3 (roadmap.md, especificacao.md §1). Grafo D3 dos gêneros.
// Começa com os gêneros mestres, ligados pela linha-guia das origens (Blues → Rock → Metal…). Clicar
// num gênero abre os subgêneros diretos (e de novo em cada subgênero) e o pop-up ao lado, com o resumo
// (os gêneros citados navegam pelo mapa), as ligações e o botão "Ir para as recomendações".
// Linhas: hierarquia (pai), origem (linhagem; entre gêneros fechados, vai para o ancestral visível) e
// influência/similar (Musicmap e `similares`, só entre gêneros visíveis). Nós e linhas flutuam de leve
// e se afastam do mouse; com "reduzir movimento" no sistema, ficam parados.
// #/cerebro/<gênero> abre o mapa já nesse gênero; a URL acompanha o gênero aberto sem recarregar a vista.
import { tituloPagina } from "../componentes/titulo.js";
import { generos, albunsPorGenero } from "../dados.js";
import { esc } from "../componentes/card-album.js";
import { resumoGenero } from "../componentes/resumo-genero.js";
import { arvoreOrdenada, descendentes } from "../arvore.js";

// Raio do círculo: base pelo nível e um acréscimo pela raiz do número de subgêneros contidos
// (todos os níveis), para que gêneros com mais ramos fiquem maiores sem que os grandes dominem
// (Blues, com 8, fica com 63; Rock, com 28, com 73).
const RAIOS = [52, 22, 16, 13];
const CRESCE = [4, 4.5, 4, 3.5];
const raio = (n) => {
  const nivel = Math.min(n.nivel, 3);
  n.qtdSub ??= descendentes(n).length;
  return RAIOS[nivel] + CRESCE[nivel] * Math.sqrt(n.qtdSub);
};
const PESO = { hierarquia: 4, guia: 3, origem: 2, influencia: 1, similar: 0 };
const coroa = `<svg class="icone coroa" aria-hidden="true"><use href="#i-coroa"/></svg>`;
const parado = matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function render(el, [generoId]) {
  const [gen, porGenero] = await Promise.all([generos(), albunsPorGenero()]);
  const mestres = arvoreOrdenada(gen.lista);
  const nos = new Map(); // id → nó da árvore (nome, nivel, filhos…) que também guarda x/y da simulação
  const pais = new Map(); // id → nó pai
  const guardar = (n, pai) => { nos.set(n.id, n); if (pai) pais.set(n.id, pai); n.filhos.forEach((f) => guardar(f, n)); };
  mestres.forEach((m) => guardar(m));
  const nomeDe = (id) => nos.get(id)?.nome;

  el.innerHTML = `
    <div class="mapa">
      <div class="mapa-topo">
        ${tituloPagina("TrackMap")}
        <p class="vista-sub">Clique num gênero para abrir os subgêneros e ler sobre ele.</p>
      </div>
      <svg class="mapa-svg" aria-label="Mapa dos gêneros musicais"><g class="camada"><g class="linhas"></g><g class="nos"></g></g></svg>
      <ul class="mapa-legenda" aria-label="Legenda">
        <li><svg viewBox="0 0 28 8" aria-hidden="true"><path class="linha guia" d="M1 4H27"/></svg>Linhagem dos mestres</li>
        <li><svg viewBox="0 0 28 8" aria-hidden="true"><path class="linha hierarquia" d="M1 4H27"/></svg>Subgênero</li>
        <li><svg viewBox="0 0 28 8" aria-hidden="true"><path class="linha origem" d="M1 4H27"/></svg>Origem</li>
        <li><svg viewBox="0 0 28 8" aria-hidden="true"><path class="linha influencia" d="M1 4H27"/></svg>Influência</li>
      </ul>
      <aside class="genero-popup" aria-live="polite" tabindex="-1" hidden></aside>
    </div>`;


  const svg = d3.select(el.querySelector(".mapa-svg"));
  const camada = svg.select(".camada");
  const camadaLinhas = camada.select(".linhas");
  const camadaNos = camada.select(".nos");
  const popup = el.querySelector(".genero-popup");

  const abertos = new Set();
  let atual = null;
  let visiveis = [];
  let linhas = [];

  // Mestres numa elipse, na ordem da árvore (vizinhos de linhagem ficam lado a lado).
  const ancora = new Map(mestres.map((m, i) => {
    const a = (i / mestres.length) * 2 * Math.PI - Math.PI / 2;
    return [m.id, { x: Math.cos(a) * 470, y: Math.sin(a) * 330 }];
  }));
  for (const m of mestres) Object.assign(m, ancora.get(m.id));
  const ancoraDe = (n) => { let m = n; while (pais.has(m.id)) m = pais.get(m.id); return ancora.get(m.id); };

  const simulacao = d3.forceSimulation()
    .force("ligacao", d3.forceLink().id((d) => d.id)
      .distance((l) => (l.tipo === "hierarquia" ? raio(l.source) + raio(l.target) + (l.target.nivel === 1 ? 64 : 40) : 220))
      .strength((l) => (l.tipo === "hierarquia" ? 0.9 : l.tipo === "origem" ? 0.03 : 0)))
    .force("carga", d3.forceManyBody().strength((d) => (d.nivel === 0 ? -1200 : -260)))
    .force("colisao", d3.forceCollide((d) => raio(d) + (d.nivel === 0 ? 26 : 16)).strength(0.9))
    .force("x", d3.forceX((d) => ancoraDe(d).x).strength((d) => (d.nivel === 0 ? 0.12 : 0.015)))
    .force("y", d3.forceY((d) => ancoraDe(d).y).strength((d) => (d.nivel === 0 ? 0.12 : 0.015)))
    .on("tick", () => parado && desenhar(0));

  // Gêneros visíveis: os mestres e os filhos de cada gênero aberto (que também esteja visível).
  function calcularVisiveis() {
    const lista = [];
    const andar = (n) => { lista.push(n); if (abertos.has(n.id)) n.filhos.forEach(andar); };
    mestres.forEach(andar);
    return lista;
  }

  function calcularLinhas(vis) {
    const ids = new Set(vis.map((n) => n.id));
    const visivelDe = (id) => { for (let n = nos.get(id); n; n = pais.get(n.id)) if (ids.has(n.id)) return n.id; return null; };
    const porPar = new Map();
    const ligar = (a, b, tipo) => {
      if (!a || !b || a === b) return;
      const chave = a < b ? `${a}|${b}` : `${b}|${a}`;
      const atualPar = porPar.get(chave);
      if (!atualPar || PESO[tipo] > PESO[atualPar.tipo]) porPar.set(chave, { source: a, target: b, tipo, fase: Math.random() * 6.3 });
    };
    for (const n of vis) if (pais.has(n.id)) ligar(pais.get(n.id).id, n.id, "hierarquia");
    for (const n of nos.values()) for (const o of n.origens || []) {
      if (!nos.has(o)) continue;
      const a = visivelDe(o), b = visivelDe(n.id);
      // Entre dois mestres, só a linhagem dos próprios mestres vira linha-guia; as origens dos
      // subgêneros fechados não ligam mestres (senão todos ficariam ligados a todos).
      const entreMestres = nos.get(a)?.nivel === 0 && nos.get(b)?.nivel === 0;
      if (!entreMestres) ligar(a, b, "origem");
      else if (n.nivel === 0) ligar(a, b, "guia");
    }
    for (const n of vis) {
      for (const o of n.influencias || []) if (ids.has(o)) ligar(n.id, o, "influencia");
      for (const o of n.similares || []) if (ids.has(o)) ligar(n.id, o, "similar");
    }
    return [...porPar.values()];
  }

  function atualizar() {
    visiveis = calcularVisiveis();
    for (const n of visiveis) if (n.x === undefined) {
      const p = pais.get(n.id);
      n.x = p.x + (Math.random() - 0.5) * 30;
      n.y = p.y + (Math.random() - 0.5) * 30;
    }
    linhas = calcularLinhas(visiveis);

    camadaLinhas.selectAll("path").data(linhas, (l) => `${l.source.id ?? l.source}|${l.target.id ?? l.target}`)
      .join((e) => e.append("path").style("opacity", 0).call((p) => p.transition().duration(400).style("opacity", null)))
      .attr("class", (l) => `linha ${l.tipo}`);

    camadaNos.selectAll("g.no").data(visiveis, (d) => d.id).join(
      (e) => {
        const g = e.append("g")
          .attr("class", (d) => `no nivel-${Math.min(d.nivel, 3)}`)
          .attr("tabindex", 0)
          .attr("role", "button")
          .attr("aria-label", (d) => d.nome)
          .on("click", (ev, d) => { ev.stopPropagation(); selecionar(d.id); })
          .on("keydown", (ev, d) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selecionar(d.id); } })
          .on("mouseenter focus", (ev, d) => realcar(d.id))
          .on("mouseleave blur", () => realcar(atual));
        g.append("circle").attr("class", "anel").attr("r", (d) => raio(d) + 5);
        g.append("circle").attr("class", "bola").attr("r", 0).transition().duration(350).attr("r", raio);
        g.filter((d) => d.nivel === 0).append("use").attr("href", "#i-coroa").attr("class", "no-coroa")
          .attr("x", -11).attr("y", -36).attr("width", 22).attr("height", 22);
        g.append("text").attr("class", "no-nome").attr("text-anchor", "middle")
          .attr("dy", (d) => (d.nivel === 0 ? 6 : raio(d) + 14))
          .text((d) => d.nome);
        // Quantos subgêneros há abaixo do gênero (todos os níveis), dentro do círculo: "X subgêneros"
        // nos mestres; só o número nos subgêneros, que são menores.
        g.filter((d) => d.filhos.length > 0).append("text").attr("class", "no-contagem").attr("text-anchor", "middle")
          .attr("dy", (d) => (d.nivel === 0 ? 26 : "0.35em"))
          .text((d) => { const n = descendentes(d).length; return d.nivel === 0 ? `${n} ${n === 1 ? "subgênero" : "subgêneros"}` : n; })
          .append("title").text((d) => { const n = descendentes(d).length; return `${n} ${n === 1 ? "subgênero" : "subgêneros"}`; });
        return g;
      },
      (u) => u,
      (x) => x.transition().duration(200).style("opacity", 0).remove(),
    )
      .classed("tem-filhos", (d) => d.filhos.length > 0)
      .classed("aberto", (d) => abertos.has(d.id))
      .classed("atual", (d) => d.id === atual)
      .attr("aria-expanded", (d) => (d.filhos.length ? String(abertos.has(d.id)) : null));

    simulacao.nodes(visiveis);
    simulacao.force("ligacao").links(linhas);
    simulacao.alpha(0.6).restart();
    realcar(atual);
  }

  // Realce: o gênero sob o mouse (ou o aberto), as linhas dele e os gêneros na outra ponta.
  function realcar(id) {
    const perto = new Set(id ? [id] : []);
    camadaLinhas.selectAll("path").classed("ativa", (l) => {
      const sim = id && (l.source.id === id || l.target.id === id);
      if (sim) { perto.add(l.source.id); perto.add(l.target.id); }
      return sim;
    });
    svg.classed("com-foco", Boolean(id));
    camadaNos.selectAll("g.no").classed("perto", (d) => perto.has(d.id));
  }

  // Desenho: posição da simulação + flutuação leve + afastamento do mouse.
  let mouse = null;
  svg.on("pointermove", (ev) => { const [x, y] = d3.zoomTransform(svg.node()).invert(d3.pointer(ev, svg.node())); mouse = { x, y }; })
    .on("pointerleave", () => { mouse = null; });
  function desenhar(t) {
    for (const n of visiveis) {
      const amp = parado ? 0 : n.nivel === 0 ? 2 : 3;
      n.fase ??= Math.random() * 6.3;
      let ex = 0, ey = 0;
      if (mouse && !parado) {
        const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy) || 1;
        const alcance = raio(n) + 70;
        if (d < alcance && n.id !== atual) { const f = ((alcance - d) / alcance) * 10; ex = (dx / d) * f; ey = (dy / d) * f; }
      }
      n.ex = (n.ex || 0) + (ex - (n.ex || 0)) * 0.12;
      n.ey = (n.ey || 0) + (ey - (n.ey || 0)) * 0.12;
      n.vx_ = n.x + Math.sin(t / 1400 + n.fase) * amp + n.ex;
      n.vy_ = n.y + Math.cos(t / 1700 + n.fase * 1.3) * amp + n.ey;
    }
    camadaNos.selectAll("g.no").attr("transform", (d) => `translate(${d.vx_},${d.vy_})`);
    camadaLinhas.selectAll("path").attr("d", (l) => {
      const a = l.source, b = l.target;
      if (a.vx_ === undefined || b.vx_ === undefined) return null;
      const mx = (a.vx_ + b.vx_) / 2, my = (a.vy_ + b.vy_) / 2;
      const dx = b.vx_ - a.vx_, dy = b.vy_ - a.vy_, d = Math.hypot(dx, dy) || 1;
      let curva = parado ? 0 : Math.sin(t / 2100 + l.fase) * Math.min(14, d * 0.05);
      if (mouse && !parado) { // a linha se curva para longe do mouse
        const dm = Math.hypot(mx - mouse.x, my - mouse.y);
        if (dm < 90) curva += ((90 - dm) / 90) * 26 * Math.sign((mouse.x - mx) * dy - (mouse.y - my) * dx || 1) * -1;
      }
      return `M${a.vx_},${a.vy_}Q${mx - (dy / d) * curva},${my + (dx / d) * curva} ${b.vx_},${b.vy_}`;
    });
  }
  const relogio = parado ? null : d3.timer(desenhar);

  // Zoom e arraste do mapa; clicar no fundo fecha o pop-up.
  const zoom = d3.zoom().scaleExtent([0.3, 2.5]).on("zoom", (ev) => camada.attr("transform", ev.transform));
  svg.call(zoom).on("dblclick.zoom", null).on("click", () => fecharPopup());
  const tamanho = () => svg.node().getBoundingClientRect();
  const larguraPopup = () => (popup.hidden || innerWidth <= 760 ? 0 : popup.getBoundingClientRect().width + 24);
  function enquadrar() {
    const { width, height } = tamanho();
    const k = Math.min(width / 1250, height / 1000, 1.1);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2 + 30).scale(k));
  }
  function centralizar(id) {
    const n = nos.get(id);
    const { width, height } = tamanho();
    const celular = innerWidth <= 760;
    const k = Math.max(d3.zoomTransform(svg.node()).k, (n.nivel === 0 ? 0.8 : 1) * (celular ? 0.7 : 1));
    const cx = (width - larguraPopup()) / 2;
    // No celular o pop-up cobre a parte de baixo: o gênero fica no meio do espaço que sobra em cima.
    const cy = celular ? height * 0.38 / 2 + 24 : height / 2;
    svg.transition().duration(650).call(zoom.transform, d3.zoomIdentity.translate(cx - n.x * k, cy - n.y * k).scale(k));
  }

  // Abre um gênero: fica aberto só o caminho até ele (os ramos de gêneros que deixaram de estar
  // clicados se fecham), mostra (ou, se já era o aberto, recolhe) os subgêneros dele, centraliza e
  // mostra o pop-up.
  function selecionar(id, { alternar = true } = {}) {
    const n = nos.get(id);
    if (!n) return;
    const recolher = alternar && atual === id && abertos.has(id);
    abertos.clear();
    for (let p = pais.get(id); p; p = pais.get(p.id)) abertos.add(p.id);
    if (n.filhos.length && !recolher) abertos.add(id);
    atual = id;
    atualizar();
    mostrarPopup(n);
    history.replaceState(null, "", `#/cerebro/${id}`);
    requestAnimationFrame(() => centralizar(id));
  }

  function mostrarPopup(n) {
    const caminho = [];
    for (let p = pais.get(n.id); p; p = pais.get(p.id)) caminho.unshift(p);
    const total = n.nivel === 0
      ? new Set([n, ...descendentes(n)].flatMap((g) => porGenero.get(g.id) || [])).size
      : (porGenero.get(n.id) || []).length;
    const subs = descendentes(n).length;
    const meta = [n.decada ? `anos ${n.decada}` : "", subs ? `${subs} ${subs === 1 ? "subgênero" : "subgêneros"}` : "", total ? `${total} álbuns` : ""].filter(Boolean).join(" · ");
    const chips = (ids) => [...new Set(ids)].filter((i) => nos.has(i) && i !== n.id)
      .map((i) => `<li><a href="#/cerebro/${i}" data-genero="${i}">${esc(nomeDe(i))}</a></li>`).join("");
    const origens = chips(n.origens || []);
    const ligados = chips([...(n.influencias || []), ...(n.similares || [])].filter((i) => !(n.origens || []).includes(i)));
    const filhos = chips(n.filhos.map((f) => f.id));

    popup.innerHTML = `
      <button type="button" class="painel-fechar" data-fechar aria-label="Fechar">×</button>
      ${caminho.length ? `<nav class="popup-caminho" aria-label="Caminho">${caminho.map((p) => `<a href="#/cerebro/${p.id}" data-genero="${p.id}">${esc(p.nome)}</a>`).join(" › ")}</nav>` : ""}
      <h2 class="popup-titulo">${n.nivel === 0 ? coroa : ""}${esc(n.nome)}</h2>
      ${meta ? `<p class="popup-meta">${meta}</p>` : ""}
      <a class="botao-recomendacoes" href="#/recomendados/${n.id}">
        <svg class="icone" aria-hidden="true"><use href="#i-recomendados"/></svg><span>Ir para as recomendações</span>
      </a>
      <div class="popup-resumo">${resumoGenero(n) || `<p class="resumo-genero">Resumo em preparação.</p>`}</div>
      ${filhos ? `<h3 class="painel-secao">Subgêneros</h3><ul class="popup-chips">${filhos}</ul>` : ""}
      ${origens ? `<h3 class="painel-secao">Vem de</h3><ul class="popup-chips">${origens}</ul>` : ""}
      ${ligados ? `<h3 class="painel-secao">Ligado a</h3><ul class="popup-chips">${ligados}</ul>` : ""}`;
    const novo = popup.hidden;
    popup.hidden = false;
    if (novo) { popup.classList.remove("aberto"); requestAnimationFrame(() => popup.classList.add("aberto")); }
    popup.scrollTop = 0;
  }

  function fecharPopup() {
    if (popup.hidden) return;
    popup.hidden = true;
    popup.classList.remove("aberto");
    atual = null;
    abertos.clear(); // sem gênero clicado, o mapa volta aos mestres
    atualizar();
    history.replaceState(null, "", "#/cerebro");
  }

  // Links dentro do pop-up (caminho, chips e gêneros citados no resumo) navegam pelo mapa.
  popup.addEventListener("click", (e) => {
    if (e.target.closest("[data-fechar]")) return fecharPopup();
    const a = e.target.closest('a[href^="#/cerebro/"]');
    if (!a) return;
    e.preventDefault();
    selecionar(a.dataset.genero || a.getAttribute("href").split("/")[2], { alternar: false });
  });
  const tecla = (e) => { if (e.key === "Escape") fecharPopup(); };
  document.addEventListener("keydown", tecla);

  // Ao sair da vista, para a animação e solta os ouvintes globais.
  const sair = () => {
    if (location.hash.startsWith("#/cerebro")) return;
    relogio?.stop();
    simulacao.stop();
    document.removeEventListener("keydown", tecla);
    removeEventListener("hashchange", sair);
  };
  addEventListener("hashchange", sair);

  atualizar();
  // O tamanho do mapa só existe depois do layout; espera ele aparecer para enquadrar.
  const aoMedir = new ResizeObserver(() => {
    if (!tamanho().width) return;
    aoMedir.disconnect();
    enquadrar();
    if (nos.has(generoId)) selecionar(generoId, { alternar: false });
  });
  aoMedir.observe(svg.node());
}
