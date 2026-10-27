# Roadmap

## Fase 0 — Decisões (fechadas em 26/10/2026)
- [x] **Stack:** site estático (HTML/CSS/JS puro, sem build) + **D3** para o grafo da Visão de Cérebro.
- [x] **Hospedagem:** GitHub Pages, repositório [`MattRahmeier/tracklore`](https://github.com/MattRahmeier/tracklore) — **privado por enquanto**; tornar público antes de ativar o Pages (plano gratuito exige).
- [x] **Streaming:** só links diretos do álbum (`links`), conferidos por `scripts/verificar-links.js`; sem link, sem botão. YouTube Music sempre pela playlist oficial do álbum. *(Revisto em 26/10/2026: antes era híbrido, com link de busca.)*
- [x] **Escopo do piloto:** gêneros mestres **Blues, Rock, Pop, Metal, Eletrônica, Hip Hop e Jazz**, com subgêneros e ~5 charts completos.
  - Gêneros mestres também têm linhagem entre si: **Blues → Rock → Metal**. Essas origens aparecem no cérebro como uma **linha-guia de conexão** (ver `modelo-de-dados.md`, campo `origens`).
- [x] **RateYourMusic:** leitura pelo **Claude in Chrome**, com a sessão do usuário, em ritmo humano e só páginas pontuais. CAPTCHA/verificação do Cloudflare é resolvido pelo usuário, nunca pelo Claude.
- [x] **Imagens:** capas via API (Cover Art Archive / Discogs), salvas em `assets/img/capas/`; fotos de gênero de fontes livres (Unsplash, Wikimedia Commons) com crédito em `data/creditos.json`.

## Fase 1 — Dados
- [x] Árvore de gêneros do piloto em `data/generos/generos.json`: 7 mestres, 127 subgêneros (Jazz segundo o Musicmap), com década, origens e similares. Validador em `scripts/validar-generos.js`.
- [x] Resumos trocados por texto da Wikipédia (`scripts/buscar-resumos.js`): 113 com fonte, 3 pendentes.
- [x] Bedroom Pop: paráfrase de comentário em r/indie indicado pelo usuário (trecho original incompleto; pode ser ampliado).
- [x] Stoner Metal: paráfrase de texto fornecido pelo usuário (fonte original ainda não informada).
- [ ] Resumo pendente — **fica separado na árvore**; o usuário vai escrever ou indicar a fonte: Abstract Hip Hop e Chicago Jazz (a Wikipédia o trata dentro de Dixieland). Ao receber, preencher `resumo` e `resumoFonte` à mão (ou `resumoArtigo` se for outra página da Wikipédia) e remover `resumoArtigo: false`/`resumoPendente`.
- [x] Menções a outros gêneros nos resumos marcadas como links (`resumoLinks`, `scripts/ligar-resumos.js`).
- [x] "Como soa" (`som`): frases da Wikipédia sobre os elementos do som de 111 gêneros (`scripts/buscar-som.js`), mostradas em continuação ao resumo.
- [ ] "Como soa" pendente em 23 gêneros (a Wikipédia não descreve o som ou o trecho era fraco): indicar outra fonte.
- [ ] Revisão da árvore pelo usuário (nomes, hierarquia, o que falta ou sobra).
- [x] Índice das 541 Essential Charts (`data/charts/mu-essential-charts.json`) e imagens baixadas em `fontes/mu-charts/` (`scripts/baixar-charts.js`).
- [x] Primeiros charts transcritos (`data/charts/mu/`), um por mestre: Blues, Post-Punk 1, Synth Pop, Black Metal, IDM, Hip Hop 1 e Jazz — 291 álbuns, 10 itens a conferir (`scripts/validar-charts.js`).
- [ ] Revisão das transcrições pelo usuário (status `revisar` → `conferido`).
- [ ] Transcrever os demais charts ligados à árvore.
- [x] Fichas dos 288 álbuns dos 7 charts (`data/albuns/albuns.json`, `scripts/criar-fichas.js`): metadados, faixas, capa (281) e links de streaming do MusicBrainz; correções manuais em `data/albuns/correcoes.json`; 8 a conferir (`scripts/validar-albuns.js`).
- [ ] Fichas de álbuns: `sobre`, tags, 2 reviews positivos.
- [ ] Scripts de coleta/validação em `scripts/`.

## Fase 2 — Base do site
- [x] Nome do site: **Tracklore**; área do grafo: **TrackMap** (renomeados em 26/10/2026).
- [x] Seta de voltar à esquerda do título de cada página (`js/componentes/titulo.js`).
- [x] Esqueleto: `index.html`, barra lateral (vira navegação inferior no celular), tokens em `css/tokens.css`, rotas por hash em `js/app.js` (`#/cerebro`, `#/curadoria`, `#/recomendados`, `#/busca`; parâmetros extras, ex. `#/cerebro/heavy-metal`), carregamento de dados em `js/dados.js`, uma vista por área em `js/vistas/`.
- [ ] Layout final com tema escuro refinado.
- [x] Ícones das plataformas (sprite em `index.html`: Spotify, YouTube, Qobuz, Apple Music, Deezer, Tidal, Bandcamp).
- [x] Componente de card de álbum (`js/componentes/card-album.js`): capa, título, artista · ano e botões só para links diretos conferidos (ícone do YouTube Music para a playlist do álbum). Em uso nas páginas de gênero do Guia de Gêneros.

## Fase 3 — Visão de Cérebro
- [ ] Grafo animado, expansão por clique, hover.
- [ ] Pop-up de gênero + "Mais informações" (playlist e álbuns).
- [ ] Links de gênero dentro do resumo navegam até o gênero citado.

## Fase 4 — Curadoria da Semana
- [ ] Página logo após o cérebro: texto, 5 álbuns (cards com streaming), bio e foto do autor, ícones de redes sociais.
- [ ] Carregar a edição mais recente por data de `data/curadorias/` + arquivo de edições anteriores.
- [ ] Validação simples da edição (5 álbuns, IDs existentes, redes conhecidas) num script em `scripts/`.
- [ ] Primeira edição de exemplo para testar o layout; a real vem de um autor convidado.

## Fase 5 — Recomendados pela Internet
- [x] Lista de gêneros com a mesma árvore do TrackMap (`js/arvore.js`): um bloco por mestre (com coroa), um card por gênero, sem sublistas (cada subgênero logo depois do gênero de onde saiu; o card mostra a década e quantos álbuns tem); irmãos em ordem cronológica e, na mesma década, em cadeia de proximidade (origens/similares). Gêneros com lista de álbuns ficam destacados.
- [ ] Fotos nos cards de gênero.
- [x] Página do gênero (`#/recomendados/<gênero>`): caminho na árvore, nome (coroa se for mestre), resumo com links e fonte, subgêneros, álbuns da lista e o disclaimer no fim. A interface não cita o site de origem das listas.
- [x] Caixa lateral do álbum ao clicar na capa (`js/componentes/painel-album.js`): lançamento, duração, nº de faixas, tipo, links de streaming com nome e fonte (MusicBrainz). Pop-up off-white à direita; no celular, sobe de baixo. Fecha com ×, Esc ou clique fora.
- [x] Caixa lateral: "Sobre este álbum" (Wikipédia) e "O que a crítica disse" (até 2 notas positivas em estrelas, com link da crítica), por `scripts/buscar-sobre-albuns.js`. A lista de faixas saiu da caixa por enquanto (continua na ficha).
- [x] Textos em inglês (165 "sobre", 7 resumos e 55 "como soa") traduzidos para o português, com aviso de tradução e link para o original.
- [x] Caixa lateral: "Faixa destaque" (média de popularidade no Deezer, no YouTube Music e no ListenBrainz, com links para a faixa) logo abaixo dos dados; os links do álbum ("Ouça o álbum") foram para depois da crítica. Fonte citada uma vez só.
- [x] Todas as fichas com lançamento, duração, gravadora e faixas (`scripts/completar-fichas.js`; validador exige os quatro).
- [x] Fichas sem lacunas: capas (busca de imagem quando preciso, com a fonte no rodapé), "sobre" em todas (Wikipédias em outros idiomas ou descrição montada com os dados), notas extras do Pitchfork e do Discogs.
- [x] Notas do RYM (usuários) via Claude in Chrome para 16 dos 25 álbuns sem crítica (`data/albuns/notas-rym.json`, `scripts/aplicar-notas-rym.js`).
- [ ] 9 álbuns seguem sem nota: 6 não têm a mesma edição no RYM (Statesboro Blues, Boss Bird!, Avalon Blues, So Many Roads ao vivo, The New York Sessions) e 4 têm média abaixo de 3,5 (Chet Baker Sextet, Carriers of Dust, Huge Chrome Cylinder Box Unfolding, Pile O' Meat).
- [ ] Caixa lateral: tags.
- [ ] "Gêneros similares" no fim da página do gênero.

## Fase 6 — Ache o Seu Som!
- [ ] Índice de busca no cliente; filtros álbum/artista/faixa.
- [ ] Copiar "Artista – Álbum", seleção múltipla, exportar .txt / clipboard.

## Fase 7 — Mobile e polimento
- [ ] Swipe esquerda/direita, layout empilhado.
- [ ] Performance do grafo, acessibilidade, publicação.
