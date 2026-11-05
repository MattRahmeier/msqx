// Pesquisa (Ache o Seu Som!) — Fase 6 (roadmap.md). Busca única por nome do álbum, artista e gênero,
// com os resultados mudando a cada tecla. Cada palavra (ou, com vírgulas, cada parte: "banda, álbum,
// gênero") estreita a busca e pode cair em um campo diferente: "radiohead kid", "slowdive, shoegaze".
// #/busca/<termo> guarda o termo no endereço (sem recarregar a página a cada tecla).
// Os descritores (vibe, som, voz, letra; vocabulário no estilo dos descriptors do RYM) também
// entram: em português ou no termo em inglês ("melancólico" ou "melancholic").
import { tituloPagina } from "../componentes/titulo.js";
import { albuns, albunsPorGenero, generos, citacoesEditoriais, descritores } from "../dados.js";
import { cardAlbum, capaHtml, esc } from "../componentes/card-album.js";
import { ligarPainel } from "../componentes/painel-album.js";
import { ADJETIVOS } from "../componentes/bandeira.js";

const POR_PAGINA = 48;

// Sem acento, minúsculo, só letras e números separados por espaço: "Beyoncé" → "beyonce".
const normalizar = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9぀-鿿가-힯]+/g, " ").trim();

// Pontos de uma palavra em um texto: começo de palavra vale mais que meio de palavra.
function casa(texto, palavra) {
  if (!texto) return 0;
  if (texto.startsWith(palavra) || texto.includes(` ${palavra}`)) return 2;
  return texto.includes(palavra) ? 1 : 0;
}

export async function render(el, [termoInicial = ""]) {
  const [{ lista, porId }, gen, porGenero, citados, desc] = await Promise.all([albuns(), generos(), albunsPorGenero(), citacoesEditoriais(), descritores()]);
  // Quantos discos têm cada descritor; os sem nenhum disco não aparecem.
  const qtdDescritor = new Map();
  for (const f of lista) for (const d of f.descritores || []) qtdDescritor.set(d, (qtdDescritor.get(d) || 0) + 1);
  const descritoresIndice = desc.lista.filter((d) => qtdDescritor.has(d.id)).map((d) => ({ d, nome: normalizar(d.nome), termo: normalizar(d.id) }));
  // Tocar num descritor faz dele a busca.
  // Todos os descritores com discos, separados por categoria, cada uma em ordem alfabética.
  const CATEGORIAS = [["clima", "Vibe"], ["som", "Som"], ["voz", "Voz"], ["letra", "Letra"], ["forma", "Forma"]];
  const todosDescritores = () => CATEGORIAS.map(([cat, titulo]) => {
    const ds = descritoresIndice.filter(({ d }) => d.categoria === cat).map((x) => x.d).sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
    // Cada grupo abre e fecha na seta ao lado do nome (começa aberto).
    return ds.length ? `<details class="busca-grupo" open><summary class="busca-categoria"><svg class="icone seta-grupo" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>${titulo} <span class="chip-n">${ds.length}</span></summary><ul class="chips">${chipsDescritores(ds)}</ul></details>` : "";
  }).join("");
  const chipsDescritores = (ds) => ds.map((d) => `<li><button type="button" class="chip-descritor" data-descritor="${esc(d.nome)}">${esc(d.nome)} <span class="chip-n">${qtdDescritor.get(d.id)}</span></button></li>`).join("");

  // Gêneros de cada disco: os dos charts e os estilos do Wikidata/MusicBrainz (albunsPorGenero).
  const generosDe = new Map();
  for (const [g, ids] of porGenero) for (const id of ids) (generosDe.get(id) || generosDe.set(id, []).get(id)).push(g);

  // Campos pesquisáveis de cada disco, já normalizados, com o peso de cada um.
  const campos = (f) => [
    { texto: normalizar(f.titulo), peso: 3 },
    { texto: normalizar(f.artista), peso: 3 },
    { texto: normalizar((generosDe.get(f.id) || []).map((g) => gen.porId.get(g)?.nome).join(" ")), peso: 1 },
    { texto: f.lancamento?.slice(0, 4) || "", peso: 1 },
    { texto: normalizar((f.descritores || []).flatMap((d) => [desc.porId.get(d)?.nome, d]).join(" ")), peso: 1 },
  ];
  const indice = lista.map((f) => ({ f, campos: campos(f) }));
  // Quantos discos cada artista tem no site (o total, não só os que casam com a busca).
  const discosDe = new Map();
  for (const f of lista) discosDe.set(f.artista, (discosDe.get(f.artista) || 0) + 1);
  const generosIndice = gen.lista.map((g) => ({ g, nome: normalizar([g.nome, ADJETIVOS[g.pais]].filter(Boolean).join(" ")) }));

  el.innerHTML = `
    ${tituloPagina("Pesquisa")}
    <div class="busca-linha">
      <form class="busca-campo" role="search" onsubmit="return false">
        <svg class="icone" aria-hidden="true"><use href="#i-busca"/></svg>
        <input type="search" id="busca-termo" name="q" placeholder="O que você quer ouvir?" autocomplete="off" spellcheck="false"
          aria-label="Pesquisar álbuns, artistas e gêneros" aria-controls="busca-resultados" value="${esc(termoInicial)}">
      </form>
      <details class="busca-dica">
        <summary aria-label="Como refinar a pesquisa" title="Como refinar a pesquisa"><span aria-hidden="true">i</span></summary>
        <p class="busca-dica-caixa">Combine palavras com vírgula (,) para refinar sua pesquisa: <em>banda, álbum, gênero, descritor</em>.</p>
      </details>
    </div>
    <p class="busca-contagem" role="status" aria-live="polite"></p>
    <div id="busca-resultados" class="busca-resultados"></div>`;

  const campo = el.querySelector("#busca-termo");
  const saida = el.querySelector("#busca-resultados");
  const contagem = el.querySelector(".busca-contagem");
  ligarPainel(saida, porId);

  let achados = [];
  let mostrando = 0;

  const etiquetas = (f) => [...new Set(generosDe.get(f.id) || [])].filter((g) => gen.porId.has(g))
    .map((g) => ({ texto: gen.porId.get(g).nome, href: `#/recomendados/${g}` }));
  const cards = (de, ate) => achados.slice(de, ate).map((f) => cardAlbum(f, { etiquetas: etiquetas(f), editoriais: citados.get(f.id) || [] })).join("");
  const botaoMais = () => achados.length > mostrando
    ? `<button type="button" class="busca-mais">Mostrar mais ${Math.min(POR_PAGINA, achados.length - mostrando)} de ${achados.length - mostrando}</button>` : "";

  function buscar() {
    const termo = campo.value;
    history.replaceState(null, "", `#/busca${termo.trim() ? `/${encodeURIComponent(termo.trim())}` : ""}`);
    // Com vírgula, cada parte é um termo inteiro ("pink floyd, 1973"); sem vírgula, cada palavra.
    const palavras = (termo.includes(",") ? termo.split(",").map(normalizar) : normalizar(termo).split(" ")).filter(Boolean);

    if (!palavras.length) {
      achados = [];
      contagem.textContent = "";
      const mestres = gen.lista.filter((g) => g.mestre);
      const climas = descritoresIndice.filter(({ d }) => d.categoria === "clima").sort((a, b) => qtdDescritor.get(b.d.id) - qtdDescritor.get(a.d.id)).slice(0, 18);
      saida.innerHTML = `
        <h2 class="secao-titulo">Comece por um gênero</h2>
        <ul class="chips">${mestres.map((g) => `<li><a href="#/recomendados/${g.id}">${esc(g.nome)}</a></li>`).join("")}</ul>
        ${climas.length ? `<h2 class="secao-titulo busca-titulo-clima">Ou por uma vibe</h2>
        <ul class="chips busca-climas">${chipsDescritores(climas.map((x) => x.d))}</ul>
        <button type="button" class="busca-todos-descritores" aria-expanded="false" aria-controls="busca-descritores-todos">Mostrar todos os descritores</button>
        <div id="busca-descritores-todos" hidden>${todosDescritores()}</div>` : ""}`;
      return;
    }

    const frase = palavras.join(" ");
    // Álbuns: toda palavra precisa casar com algum campo; a pontuação soma o melhor campo de cada uma.
    const pontuados = [];
    for (const { f, campos: cs } of indice) {
      let total = 0;
      for (const p of palavras) {
        const melhor = Math.max(...cs.map((c) => casa(c.texto, p) * c.peso));
        if (!melhor) { total = 0; break; }
        total += melhor;
      }
      if (!total) continue;
      // Bônus quando o título ou o artista é o termo inteiro ou começa por ele ("rad" → Radiohead primeiro).
      for (const c of cs.slice(0, 2)) total += c.texto === frase ? 8 : c.texto.startsWith(frase) ? 4 : 0;
      pontuados.push({ f, total });
    }
    pontuados.sort((a, b) => b.total - a.total || (a.f.lancamento || "9999").localeCompare(b.f.lancamento || "9999"));
    achados = pontuados.map((x) => x.f);

    // Gêneros: o nome contém o termo inteiro ou alguma palavra de 3+ letras no começo de uma palavra do nome.
    const gens = generosIndice.filter(({ nome }) => nome.includes(frase) || palavras.some((p) => p.length >= 3 && casa(nome, p) === 2))
      .sort((a, b) => Number(b.nome.startsWith(frase)) - Number(a.nome.startsWith(frase)) || a.nome.localeCompare(b.nome))
      .slice(0, 16).map((x) => x.g);

    // Descritores: o nome em português ou o termo em inglês começa por alguma palavra de 3+ letras.
    const descs = descritoresIndice.filter(({ nome, termo }) => nome.includes(frase) || termo.includes(frase) || palavras.some((p) => p.length >= 3 && (casa(nome, p) === 2 || casa(termo, p) === 2)))
      .slice(0, 12).map((x) => x.d);

    // Artistas: entre os discos achados, os cujo nome casa com alguma das palavras.
    const artistas = new Map();
    for (const f of achados) {
      const nome = normalizar(f.artista);
      if (!palavras.some((p) => casa(nome, p))) continue;
      if (!artistas.has(f.artista)) artistas.set(f.artista, { nome: f.artista, capa: f, n: discosDe.get(f.artista) });
    }
    // Quem tem a palavra no começo do nome vem antes de quem só a tem no meio ("rad": Radiohead, depois Brad).
    const inicio = (a) => palavras.some((p) => casa(normalizar(a.nome), p) === 2);
    const listaArtistas = [...artistas.values()].sort((a, b) => inicio(b) - inicio(a)).slice(0, 12);

    mostrando = Math.min(POR_PAGINA, achados.length);
    contagem.textContent = achados.length || gens.length
      ? [achados.length && `${achados.length} ${achados.length === 1 ? "álbum" : "álbuns"}`, gens.length && `${gens.length} ${gens.length === 1 ? "gênero" : "gêneros"}`].filter(Boolean).join(" · ")
      : "";
    saida.innerHTML = !achados.length && !gens.length
      ? `<p class="aviso">Nada encontrado para “${esc(termo.trim())}”. Tente outra grafia ou menos palavras.</p>`
      : `
        ${gens.length ? `
          <section class="busca-secao"><h2 class="secao-titulo">Gêneros</h2>
          <ul class="chips">${gens.map((g) => `<li><a href="#/recomendados/${g.id}">${esc(g.nome)}${porGenero.get(g.id)?.length ? ` <span class="chip-n">${porGenero.get(g.id).length}</span>` : ""}</a></li>`).join("")}</ul></section>` : ""}
        ${descs.length ? `
          <section class="busca-secao"><h2 class="secao-titulo">Descritores</h2>
          <ul class="chips">${chipsDescritores(descs)}</ul></section>` : ""}
        ${listaArtistas.length ? `
          <section class="busca-secao"><h2 class="secao-titulo">Artistas</h2>
          <ul class="busca-artistas">${listaArtistas.map((a) => `
            <li><button type="button" class="busca-artista" data-artista="${esc(a.nome)}">
              <span class="busca-artista-capa">${capaHtml(a.capa)}</span>
              <span class="busca-artista-nome">${esc(a.nome)}</span>
              <span class="busca-artista-n">${a.n} ${a.n === 1 ? "álbum" : "álbuns"}</span>
            </button></li>`).join("")}</ul></section>` : ""}
        ${achados.length ? `
          <section class="busca-secao"><h2 class="secao-titulo">Álbuns</h2>
          <div class="grade-albuns">${cards(0, mostrando)}</div>${botaoMais()}</section>` : ""}`;
  }

  // A caixa de informação fecha ao tocar fora dela ou com Esc.
  const dica = el.querySelector(".busca-dica");
  const fecharDica = (e) => { if (!el.isConnected) return document.removeEventListener("click", fecharDica); if (dica.open && !dica.contains(e.target)) dica.open = false; };
  document.addEventListener("click", fecharDica);
  dica.addEventListener("keydown", (e) => { if (e.key === "Escape") { dica.open = false; dica.querySelector("summary").focus(); } });

  let espera;
  campo.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(buscar, 90); });
  campo.addEventListener("keydown", (e) => { if (e.key === "Escape" && campo.value) { e.preventDefault(); campo.value = ""; buscar(); } });
  saida.addEventListener("click", (e) => {
    // Artista: a busca passa a ser o nome dele.
    const artista = e.target.closest("[data-artista]");
    if (artista) { campo.value = artista.dataset.artista; buscar(); campo.focus(); return; }
    // "Mostrar todos os descritores": abre a lista completa no lugar das vibes mais comuns.
    const todos = e.target.closest(".busca-todos-descritores");
    if (todos) {
      const abrir = todos.getAttribute("aria-expanded") === "false";
      todos.setAttribute("aria-expanded", String(abrir));
      todos.textContent = abrir ? "Mostrar só as vibes mais comuns" : "Mostrar todos os descritores";
      saida.querySelector("#busca-descritores-todos").hidden = !abrir;
      saida.querySelector(".busca-climas").hidden = abrir;
      return;
    }
    const descritor = e.target.closest("[data-descritor]");
    if (descritor) { campo.value = descritor.dataset.descritor; buscar(); campo.focus(); return; }
    if (e.target.closest(".busca-mais")) {
      const de = mostrando;
      mostrando = Math.min(mostrando + POR_PAGINA, achados.length);
      e.target.closest(".busca-mais").remove();
      const grade = saida.querySelector(".grade-albuns");
      grade.insertAdjacentHTML("beforeend", cards(de, mostrando));
      grade.insertAdjacentHTML("afterend", botaoMais());
    }
  });

  buscar();
  // Depois do foco que o roteador dá ao conteúdo (app.js), o cursor vai para o fim do campo.
  setTimeout(() => { campo.focus({ preventScroll: true }); campo.setSelectionRange(campo.value.length, campo.value.length); });
}
