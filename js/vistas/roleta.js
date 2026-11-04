// Roleta de gêneros (#/roleta): uma fatia para cada gênero com álbuns, agrupadas por mestre na ordem
// da árvore. Todas as fatias têm o mesmo tamanho, então todos os gêneros têm a mesma chance.
// Ao parar, mostra o gênero sorteado com o link para a página dele no Guia de Gêneros.
import { tituloPagina } from "../componentes/titulo.js";
import { albunsPorGenero, generos } from "../dados.js";
import { esc } from "../componentes/card-album.js";
import { arvoreOrdenada, descendentes } from "../arvore.js";

const TAMANHO = 400, CENTRO = TAMANHO / 2, RAIO = 192;
const VOLTAS = 6, DURACAO = 4500;
const desacelera = (t) => 1 - (1 - t) ** 4;

const ponto = (graus) => {
  const r = (graus - 90) * Math.PI / 180;
  return `${(CENTRO + RAIO * Math.cos(r)).toFixed(2)} ${(CENTRO + RAIO * Math.sin(r)).toFixed(2)}`;
};

// Fatias em ordem, cada uma com o mestre a que pertence (e os dados para a legenda do resultado).
function montarFatias(gen, porGenero) {
  const fatias = [];
  const arvore = arvoreOrdenada(gen.lista);
  arvore.forEach((m, grupo) => {
    const nos = [m, ...descendentes(m)];
    const total = new Set(nos.flatMap((g) => porGenero.get(g.id) || [])).size;
    for (const g of nos) {
      const albuns = g.mestre ? total : porGenero.get(g.id)?.length || 0;
      if (albuns) fatias.push({ id: g.id, nome: g.nome, decada: g.decada, mestre: m.nome, ehMestre: !!g.mestre, albuns, grupo });
    }
  });
  return fatias;
}

function rodaHtml(fatias) {
  const passo = 360 / fatias.length;
  const paths = fatias.map((f, i) => `<path class="roleta-fatia tom-${f.grupo % 2}" d="M${CENTRO} ${CENTRO}L${ponto(i * passo)}A${RAIO} ${RAIO} 0 0 1 ${ponto((i + 1) * passo)}Z"/>`).join("");
  // Nome de cada mestre sobre o seu grupo de fatias, do centro para a borda. Grupo com menos de 4
  // fatias fica sem nome: não cabe, e os nomes de grupos vizinhos se sobrepõem.
  const grupos = [...new Set(fatias.map((f) => f.grupo))].map((grupo) => {
    const dentro = fatias.flatMap((f, i) => (f.grupo === grupo ? [i] : []));
    if (dentro.length < 4) return "";
    const meio = (dentro[0] + dentro[dentro.length - 1] + 1) / 2 * passo;
    return `<text class="roleta-mestre tom-${grupo % 2}" transform="rotate(${(meio - 90).toFixed(2)} ${CENTRO} ${CENTRO})" x="${CENTRO + RAIO - 10}" y="${CENTRO}" text-anchor="end" dominant-baseline="central">${esc(fatias[dentro[0]].mestre)}</text>`;
  }).join("");
  return `<svg class="roleta-roda" viewBox="0 0 ${TAMANHO} ${TAMANHO}" aria-hidden="true">${paths}${grupos}</svg>`;
}

const legenda = (f) => [f.ehMestre ? "Gênero mestre" : f.mestre, f.decada ? `anos ${f.decada}` : "", `${f.albuns} ${f.albuns === 1 ? "álbum" : "álbuns"}`].filter(Boolean).join(" · ");

export async function render(el) {
  const [porGenero, gen] = await Promise.all([albunsPorGenero(), generos()]);
  const fatias = montarFatias(gen, porGenero);
  const passo = 360 / fatias.length;

  el.innerHTML = `
    ${tituloPagina("Roleta de Gêneros", "recomendados", { rotuloVoltar: "Voltar ao Guia de Gêneros" })}
    <p class="vista-sub">Gire e descubra um dos ${fatias.length} gêneros do Tracklore.</p>
    <section class="roleta" aria-label="Roleta de gêneros">
      <div class="roleta-caixa">
        <span class="roleta-seta" aria-hidden="true"></span>
        ${rodaHtml(fatias)}
        <button type="button" class="roleta-girar">Girar</button>
      </div>
      <div class="roleta-resultado">
        <p class="roleta-nome" aria-hidden="true">&nbsp;</p>
        <p class="roleta-legenda">&nbsp;</p>
        <p class="visualmente-oculto" aria-live="polite"></p>
        <a class="roleta-ir" hidden></a>
      </div>
    </section>`;

  const roda = el.querySelector(".roleta-roda");
  const botao = el.querySelector(".roleta-girar");
  const nome = el.querySelector(".roleta-nome");
  const sub = el.querySelector(".roleta-legenda");
  const anuncio = el.querySelector("[aria-live]");
  const ir = el.querySelector(".roleta-ir");
  let angulo = 0;
  let ultimo = -1;

  const girarPara = (graus) => {
    angulo = graus;
    roda.style.transform = `rotate(${graus}deg)`;
  };
  // Fatia embaixo da seta, no alto da roda.
  const naSeta = () => Math.floor(((360 - (angulo % 360)) % 360) / passo) % fatias.length;

  const parar = (i) => {
    const f = fatias[i];
    nome.textContent = f.nome;
    sub.textContent = legenda(f);
    anuncio.textContent = `Gênero sorteado: ${f.nome}. ${legenda(f)}.`;
    ir.href = `#/recomendados/${f.id}`;
    ir.textContent = `Ir para ${f.nome}`;
    ir.hidden = false;
    botao.disabled = false;
    botao.textContent = "Girar de novo";
    botao.classList.add("de-novo");
    ultimo = i;
  };

  botao.addEventListener("click", () => {
    botao.disabled = true;
    ir.hidden = true;
    sub.innerHTML = "&nbsp;";
    anuncio.textContent = "";
    // Sorteio entre todos, menos o que acabou de sair (senão parece que a roleta não girou).
    let i = Math.floor(Math.random() * (fatias.length - 1));
    if (i >= ultimo && ultimo >= 0) i += 1;
    const desvio = (Math.random() - 0.5) * passo * 0.7; // não parar sempre no meio da fatia
    const inicio = angulo;
    const fim = inicio - (inicio % 360) + 360 * VOLTAS + (360 - (i + 0.5) * passo) + desvio;

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      girarPara(fim);
      parar(i);
      return;
    }
    const comeco = performance.now();
    const quadro = (agora) => {
      if (!roda.isConnected) return; // a pessoa saiu da página no meio do giro
      const t = Math.min((agora - comeco) / DURACAO, 1);
      girarPara(inicio + (fim - inicio) * desacelera(t));
      nome.textContent = fatias[naSeta()].nome;
      if (t < 1) requestAnimationFrame(quadro);
      else parar(i);
    };
    requestAnimationFrame(quadro);
  });
}
