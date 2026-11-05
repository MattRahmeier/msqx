// Bandeira dos gêneros ligados a um só país (campo "pais" em data/generos/generos.json, código ISO).
// Desenho em SVG porque o Windows não mostra emoji de bandeira.
const DESENHOS = {
  BR: `<rect width="30" height="20" fill="#229e45"/><path d="M15 3l11 7-11 7L4 10z" fill="#f8e509"/><circle cx="15" cy="10" r="4.2" fill="#2b49a3"/>`,
  JP: `<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>`,
  KR: `<rect width="30" height="20" fill="#fff"/><path d="M10 10a5 5 0 0 1 10 0z" fill="#cd2e3a"/><path d="M10 10a5 5 0 0 0 10 0z" fill="#0047a0"/><path d="M4 5l3-2M5 7l3-2M26 5l-3-2M25 7l-3-2M4 15l3 2M5 13l3 2M26 15l-3 2M25 13l-3 2" stroke="#000" stroke-width="1"/>`,
  GB: `<rect width="30" height="20" fill="#012169"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.5"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6.5"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.5"/>`,
  DE: `<rect width="30" height="20" fill="#ffce00"/><rect width="30" height="13.3" fill="#d00"/><rect width="30" height="6.7" fill="#000"/>`,
  FR: `<rect width="30" height="20" fill="#ed2939"/><rect width="20" height="20" fill="#fff"/><rect width="10" height="20" fill="#002395"/>`,
  CN: `<rect width="30" height="20" fill="#de2910"/><path d="M7 3l1.2 3.6H12L9 8.8l1.1 3.6L7 10.200l-3.100 2.200L5 8.800 2 6.600h3.800z" fill="#ffde00"/><g fill="#ffde00"><circle cx="14" cy="3" r="1"/><circle cx="16" cy="6" r="1"/><circle cx="16" cy="10" r="1"/><circle cx="14" cy="13" r="1"/></g>`,
  IN: `<rect width="30" height="20" fill="#138808"/><rect width="30" height="13.300" fill="#fff"/><rect width="30" height="6.700" fill="#f93"/><circle cx="15" cy="10" r="2.600" fill="none" stroke="#000080" stroke-width="1"/>`,
  US: `<rect width="30" height="20" fill="#fff"/><path d="M0 1.500h30M0 4.600h30M0 7.700h30M0 10.800h30M0 13.900h30M0 17h30" stroke="#b22234" stroke-width="1.550"/><rect width="13" height="10.800" fill="#3c3b6e"/><g fill="#fff"><circle cx="3" cy="2.700" r=".8"/><circle cx="6.500" cy="2.700" r=".8"/><circle cx="10" cy="2.700" r=".8"/><circle cx="3" cy="5.400" r=".8"/><circle cx="6.500" cy="5.400" r=".8"/><circle cx="10" cy="5.400" r=".8"/><circle cx="3" cy="8.100" r=".8"/><circle cx="6.500" cy="8.100" r=".8"/><circle cx="10" cy="8.100" r=".8"/></g>`,
};

// Como o gênero é chamado: dá nome à bandeira para leitores de tela e entra na Pesquisa ("brasileiro").
export const ADJETIVOS = { BR: "brasileiro", JP: "japonês", KR: "coreano", GB: "britânico", DE: "alemão", FR: "francês", CN: "chinês", IN: "indiano", US: "americano" };

export function bandeira(pais) {
  if (!DESENHOS[pais]) return "";
  return `<svg class="bandeira" viewBox="0 0 30 20" role="img" aria-label="Gênero ${ADJETIVOS[pais]}"><title>Gênero ${ADJETIVOS[pais]}</title>${DESENHOS[pais]}</svg>`;
}
