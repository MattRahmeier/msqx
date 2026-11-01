// Ordem da árvore de gêneros (mesma hierarquia do TrackMap: mestre → subgênero → …).
// Irmãos ficam em ordem cronológica (década) e, dentro da mesma década, em cadeia de proximidade:
// o próximo é o mais ligado ao anterior (origens e similares); empate fica na ordem do JSON.

function ligacao(a, b) {
  return (b.origens?.includes(a.id) ? 2 : 0) + (a.origens?.includes(b.id) ? 2 : 0)
    + (a.similares?.includes(b.id) || b.similares?.includes(a.id) ? 1 : 0);
}

function emCadeia(irmaos, indice) {
  const resto = [...irmaos].sort((a, b) => (a.decada ?? 9999) - (b.decada ?? 9999) || indice.get(a.id) - indice.get(b.id));
  const saida = resto.length ? [resto.shift()] : [];
  while (resto.length) {
    const ultimo = saida[saida.length - 1];
    let melhor = 0;
    for (let i = 1; i < resto.length && resto[i].decada === resto[0].decada; i++) {
      if (ligacao(ultimo, resto[i]) > ligacao(ultimo, resto[melhor])) melhor = i;
    }
    saida.push(resto.splice(melhor, 1)[0]);
  }
  return saida;
}

// Mestres em ordem de linhagem: Música Clássica; Blues → Jazz; Blues → Rock → Metal; Pop; Eletrônica → Hip Hop; World Music.
// Mestres novos que não estiverem aqui vão para o fim.
const ORDEM_MESTRES = ["musica-classica", "blues", "jazz", "rock", "metal", "pop", "eletronica", "hip-hop", "world-music", "trilha-sonora"];
const posMestre = (g) => (ORDEM_MESTRES.includes(g.id) ? ORDEM_MESTRES.indexOf(g.id) : ORDEM_MESTRES.length);

// Guia de Gêneros: Música Clássica e World Music primeiro; o resto pela década de origem (empate na
// ordem de linhagem acima).
const PRIMEIROS_NO_GUIA = ["musica-classica", "world-music", "trilha-sonora"];
const porOrigem = (a, b) => {
  const pa = PRIMEIROS_NO_GUIA.indexOf(a.id), pb = PRIMEIROS_NO_GUIA.indexOf(b.id);
  if (pa >= 0 || pb >= 0) return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
  return (a.decada ?? 9999) - (b.decada ?? 9999) || posMestre(a) - posMestre(b);
};

// Devolve os mestres em ordem, cada nó com `filhos` (também ordenados) e `nivel`.
// `guia`: ordem do Guia de Gêneros (porOrigem) em vez da ordem de linhagem do TrackMap.
export function arvoreOrdenada(lista, { guia = false } = {}) {
  const indice = new Map(lista.map((g, i) => [g.id, i]));
  const filhosDe = new Map();
  for (const g of lista) if (g.pai) (filhosDe.get(g.pai) || filhosDe.set(g.pai, []).get(g.pai)).push(g);
  const montar = (g, nivel) => ({ ...g, nivel, filhos: emCadeia(filhosDe.get(g.id) || [], indice).map((f) => montar(f, nivel + 1)) });
  const ordem = guia ? porOrigem : (a, b) => posMestre(a) - posMestre(b) || indice.get(a.id) - indice.get(b.id);
  return lista.filter((g) => g.mestre).sort(ordem).map((m) => montar(m, 0));
}

// Todos os descendentes de um nó, em ordem.
export const descendentes = (no) => no.filhos.flatMap((f) => [f, ...descendentes(f)]);
