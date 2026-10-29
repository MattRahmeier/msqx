// TrackMap (Visão de Cérebro) — Fase 3 (roadmap.md, especificacao.md §1). Grafo D3 dos gêneros.
// Começa com os gêneros mestres, ligados pela linha-guia das origens (Blues → Rock → Metal…). Clicar
// num gênero abre os subgêneros diretos (e de novo em cada subgênero) e o pop-up ao lado, com o resumo
// (os gêneros citados navegam pelo mapa), as ligações e o botão "Ir para as recomendações".
// Linhas: hierarquia (pai), origem (linhagem; entre gêneros fechados, vai para o ancestral visível) e
// influência/similar (Musicmap e `similares`, só entre gêneros visíveis). Os subgêneros saem de dentro
// do círculo do pai e se abrem num leque virado para fora do mapa, cada um com espaço para o nome
// (um toque não cai no vizinho). Cor pela profundidade: mestre preto, subgêneros clareando até o
// branco. Nós flutuam de leve (sem fugir do mouse); com "reduzir movimento" no sistema, ficam parados.
// #/trackmap/<gênero> abre o mapa já nesse gênero; a URL acompanha o gênero aberto sem recarregar a vista.
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
// Espaço que o gênero ocupa: o círculo e, nos subgêneros, o nome escrito embaixo dele (cerca de 6,5 px
// por letra). Os vizinhos nunca chegam mais perto que isso, para um toque não cair no gênero ao lado.
const folga = (n) => Math.max(raio(n) + 14, n.nivel === 0 ? 0 : n.nome.length * 3.3 + 12);
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

  let escala = 1; // zoom atual do mapa
  const raioToque = (d) => Math.min(folga(d) - 2, Math.max(raio(d) + 4, 22 / escala));
  const abertos = new Set();
  let atual = null;
  let visiveis = [];
  let linhas = [];

  // Mestres numa elipse, na ordem da árvore (vizinhos de linhagem ficam lado a lado).
  const ancora = new Map(mestres.map((m, i) => {
    const a = (i / mestres.length) * 2 * Math.PI - Math.PI / 2;
    return [m.id, { x: Math.cos(a) * 470, y: Math.sin(a) * 330 }];
  }));
  for (const m of mestres) Object.assign(m, ancora.get(m.id), { alvo: ancora.get(m.id) });

  // Leque dos subgêneros de um gênero aberto: um arco virado para fora do mapa (para longe do
  // gênero de onde ele saiu, ou do centro no caso dos mestres), com espaço para o nome de cada um.
  // Muitos subgêneros aumentam o raio do arco em vez de apertar os vizinhos.
  const ARCO_MAX = Math.PI * 1.15;
  function leque(p) {
    const larguras = p.filhos.map((f) => 2 * folga(f) + 8);
    const total = larguras.reduce((a, b) => a + b, 0);
    const maior = Math.max(...p.filhos.map(folga));
    const r = Math.max(folga(p) + maior + 36, total / ARCO_MAX);
    let acc = -total / r / 2;
    const angulos = larguras.map((l) => { const a = acc + l / r / 2; acc += l / r; return a; });
    return { r, angulos, alcance: r + maior };
  }

  // Posição de destino de cada gênero visível. Os mestres ficam nas âncoras; o mestre aberto empurra
  // os outros para fora do alcance do leque dele.
  function calcularAlvos() {
    const mestreAberto = mestres.find((m) => abertos.has(m.id));
    const alcance = mestreAberto ? leque(mestreAberto).alcance : 0;
    for (const m of mestres) {
      const a = ancora.get(m.id);
      m.alvo = a;
      if (!mestreAberto || m === mestreAberto) continue;
      const c = ancora.get(mestreAberto.id), dx = a.x - c.x, dy = a.y - c.y, d = Math.hypot(dx, dy) || 1;
      const preciso = alcance + folga(m) + 40;
      if (d < preciso) m.alvo = { x: c.x + (dx / d) * preciso, y: c.y + (dy / d) * preciso };
    }
    const abrir = (p, origem) => {
      if (!abertos.has(p.id) || !p.filhos.length) return;
      const { r, angulos } = leque(p);
      const base = Math.atan2(p.alvo.y - origem.y, p.alvo.x - origem.x);
      p.filhos.forEach((f, i) => {
        f.alvo = { x: p.alvo.x + Math.cos(base + angulos[i]) * r, y: p.alvo.y + Math.sin(base + angulos[i]) * r };
        abrir(f, p.alvo);
      });
    };
    mestres.forEach((m) => abrir(m, { x: 0, y: 0 }));
  }

  const simulacao = d3.forceSimulation()
    .force("ligacao", d3.forceLink().id((d) => d.id).distance(220).strength(0))
    .force("colisao", d3.forceCollide((d) => folga(d) + (d.nivel === 0 ? 26 : 4)).strength(0.8))
    .force("x", d3.forceX((d) => d.alvo.x).strength((d) => (d.nivel === 0 ? 0.14 : 0.32)))
    .force("y", d3.forceY((d) => d.alvo.y).strength((d) => (d.nivel === 0 ? 0.14 : 0.32)))
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
    calcularAlvos();
    // Subgênero que aparece nasce no centro do pai (por baixo dele) e sai em direção ao leque.
    for (const n of visiveis) if (pais.has(n.id) && (n.saindo || !n.visivel)) {
      const p = pais.get(n.id);
      Object.assign(n, { x: p.x, y: p.y, vx: 0, vy: 0, vx_: p.vx_ ?? p.x, vy_: p.vy_ ?? p.y, ex: 0, ey: 0 });
    }
    const ids = new Set(visiveis.map((n) => n.id));
    for (const n of nos.values()) { n.saindo = n.visivel && !ids.has(n.id); n.visivel = ids.has(n.id); }
    linhas = calcularLinhas(visiveis);

    camadaLinhas.selectAll("path").data(linhas, (l) => `${l.source.id ?? l.source}|${l.target.id ?? l.target}`)
      .join((e) => e.append("path").style("opacity", 0).call((p) => p.transition().duration(400).style("opacity", null)))
      .attr("class", (l) => `linha ${l.tipo}`);

    camadaNos.selectAll("g.no").data(visiveis, (d) => d.id).join(
      (e) => {
        const g = e.insert("g", ":first-child")
          .attr("class", (d) => `no nivel-${Math.min(d.nivel, 4)}`)
          .attr("tabindex", 0)
          .attr("role", "button")
          .attr("aria-label", (d) => d.nome)
          .on("click", (ev, d) => { ev.stopPropagation(); selecionar(d.id); })
          .on("keydown", (ev, d) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selecionar(d.id); } })
          .on("mouseenter focus", (ev, d) => realcar(d.id))
          .on("mouseleave blur", () => realcar(atual));
        // Área de toque: o círculo, ampliada para uns 22 px de raio na tela quando o mapa está
        // afastado (refeita a cada zoom), mas nunca além da folga: não invade o vizinho.
        g.append("circle").attr("class", "toque").attr("r", (d) => raioToque(d));
        g.append("circle").attr("class", "anel").attr("r", (d) => raio(d) + 5);
        g.append("circle").attr("class", "bola").attr("r", (d) => (d.nivel === 0 ? raio(d) : raio(d) * 0.4))
          .transition().duration(500).ease(d3.easeCubicOut).attr("r", raio);
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
      // Ao fechar, o subgênero volta para dentro do pai e some.
      (x) => x.style("pointer-events", "none").transition().duration(350).style("opacity", 0).remove(),
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

  // Desenho: posição da simulação + flutuação leve. Os gêneros não fogem do mouse (o alvo do clique
  // fica parado); só as linhas se curvam para longe dele.
  let mouse = null;
  svg.on("pointermove", (ev) => { const [x, y] = d3.zoomTransform(svg.node()).invert(d3.pointer(ev, svg.node())); mouse = { x, y }; })
    .on("pointerleave", () => { mouse = null; });
  function desenhar(t) {
    for (const n of visiveis) {
      const amp = parado ? 0 : n.nivel === 0 ? 1.5 : 1.2;
      n.fase ??= Math.random() * 6.3;
      n.vx_ = n.x + Math.sin(t / 1400 + n.fase) * amp;
      n.vy_ = n.y + Math.cos(t / 1700 + n.fase * 1.3) * amp;
    }
    // Os que estão saindo deslizam de volta para o centro do pai.
    for (const n of nos.values()) if (n.saindo) {
      const p = pais.get(n.id);
      n.vx_ += ((p.vx_ ?? p.x) - n.vx_) * 0.18;
      n.vy_ += ((p.vy_ ?? p.y) - n.vy_) * 0.18;
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
  const zoom = d3.zoom().scaleExtent([0.3, 2.5]).on("zoom", (ev) => {
    camada.attr("transform", ev.transform);
    escala = ev.transform.k;
    camadaNos.selectAll("circle.toque").attr("r", raioToque);
  });
  svg.call(zoom).on("dblclick.zoom", null).on("click", () => fecharPopup());
  const tamanho = () => svg.node().getBoundingClientRect();
  const larguraPopup = () => (popup.hidden || innerWidth <= 760 ? 0 : popup.getBoundingClientRect().width + 24);
  // Visão geral: todos os mestres no quadro (com transição quando volta de um gênero aberto).
  function enquadrar(animar = false) {
    const { width, height } = tamanho();
    const k = Math.min(width / 1250, height / 1000, 1.1);
    const alvo = d3.zoomIdentity.translate(width / 2, height / 2 + 30).scale(k);
    (animar && !parado ? svg.transition().duration(650) : svg).call(zoom.transform, alvo);
  }
  // Enquadra o gênero e o leque dos subgêneros dele (pelas posições de destino, já conhecidas) no
  // espaço livre ao lado do pop-up; no celular, na parte de cima, acima do pop-up.
  function centralizar(id) {
    const n = nos.get(id);
    const { width, height } = tamanho();
    const celular = innerWidth <= 760;
    const grupo = [n, ...(abertos.has(id) ? n.filhos : [])];
    const x0 = Math.min(...grupo.map((g) => g.alvo.x - folga(g))), x1 = Math.max(...grupo.map((g) => g.alvo.x + folga(g)));
    const y0 = Math.min(...grupo.map((g) => g.alvo.y - folga(g))), y1 = Math.max(...grupo.map((g) => g.alvo.y + folga(g) + 16));
    const livreL = width - larguraPopup() - 32;
    const livreA = (celular ? height * 0.5 : height) - 48;
    const k = Math.max(celular ? 0.32 : 0.45, Math.min(livreL / (x1 - x0), livreA / (y1 - y0), celular ? 1.1 : 1.4));
    const cx = (width - larguraPopup()) / 2;
    const cy = celular ? height * 0.5 / 2 + 24 : height / 2;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    svg.transition().duration(650).call(zoom.transform, d3.zoomIdentity.translate(cx - mx * k, cy - my * k).scale(k));
  }

  // Abre um gênero: fica aberto só o caminho até ele (os ramos de gêneros que deixaram de estar
  // clicados se fecham), mostra (ou, se já era o aberto, recolhe) os subgêneros dele, centraliza e
  // mostra o pop-up.
  function selecionar(id, { alternar = true } = {}) {
    const n = nos.get(id);
    if (!n) return;
    const recolher = alternar && atual === id && abertos.has(id);
    // Desclicar o gênero mestre aberto volta à visão geral (fecha tudo e reenquadra o mapa).
    if (recolher && n.nivel === 0) return fecharPopup();
    abertos.clear();
    for (let p = pais.get(id); p; p = pais.get(p.id)) abertos.add(p.id);
    if (n.filhos.length && !recolher) abertos.add(id);
    atual = id;
    atualizar();
    mostrarPopup(n);
    history.replaceState(null, "", `#/trackmap/${id}`);
    requestAnimationFrame(() => centralizar(id));
  }

  function mostrarPopup(n) {
    const caminho = [];
    for (let p = pais.get(n.id); p; p = pais.get(p.id)) caminho.unshift(p);
    const total = n.nivel === 0
      ? new Set([n, ...descendentes(n)].flatMap((g) => porGenero.get(g.id) || [])).size
      : (porGenero.get(n.id) || []).length;
    const subs = descendentes(n).length;
    const meta = [n.decada ? `anos ${n.decada}` : "", subs ? `${subs} ${subs === 1 ? "subgênero" : "subgêneros"}` : ""].filter(Boolean).join(" · ");
    const albuns = `${total} ${total === 1 ? "álbum" : "álbuns"}`;
    const chips = (ids) => [...new Set(ids)].filter((i) => nos.has(i) && i !== n.id)
      .map((i) => `<li><a href="#/trackmap/${i}" data-genero="${i}">${esc(nomeDe(i))}</a></li>`).join("");
    const origens = chips(n.origens || []);
    const ligados = chips([...(n.influencias || []), ...(n.similares || [])].filter((i) => !(n.origens || []).includes(i)));
    const filhos = chips(n.filhos.map((f) => f.id));

    popup.innerHTML = `
      <button type="button" class="painel-fechar" data-fechar aria-label="Fechar">×</button>
      ${caminho.length ? `<nav class="popup-caminho" aria-label="Caminho">${caminho.map((p) => `<a href="#/trackmap/${p.id}" data-genero="${p.id}">${esc(p.nome)}</a>`).join(" › ")}</nav>` : ""}
      <h2 class="popup-titulo">${n.nivel === 0 ? coroa : ""}${esc(n.nome)}</h2>
      ${meta ? `<p class="popup-meta">${meta}</p>` : ""}
      <a class="botao-recomendacoes" href="#/recomendados/${n.id}" aria-label="Ir para as recomendações: ${albuns}">
        <svg class="icone" aria-hidden="true"><use href="#i-recomendados"/></svg><span>Ir para as recomendações</span>
        <span class="botao-contagem">${albuns}</span>
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
    history.replaceState(null, "", "#/trackmap");
    enquadrar(true);
  }

  // Links dentro do pop-up (caminho, chips e gêneros citados no resumo) navegam pelo mapa.
  popup.addEventListener("click", (e) => {
    if (e.target.closest("[data-fechar]")) return fecharPopup();
    const a = e.target.closest('a[href^="#/trackmap/"]');
    if (!a) return;
    e.preventDefault();
    selecionar(a.dataset.genero || a.getAttribute("href").split("/")[2], { alternar: false });
  });
  const tecla = (e) => { if (e.key === "Escape") fecharPopup(); };
  document.addEventListener("keydown", tecla);

  // Ao sair da vista, para a animação e solta os ouvintes globais.
  const sair = () => {
    if (location.hash.startsWith("#/trackmap")) return;
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
