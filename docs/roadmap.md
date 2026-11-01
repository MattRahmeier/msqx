# Roadmap

## Fase 0 — Decisões (fechadas em 26/10/2026)
- [x] **Stack:** site estático (HTML/CSS/JS puro, sem build) + **D3** para o grafo da Visão de Cérebro.
- [x] **Hospedagem:** GitHub Pages, repositório [`MattRahmeier/tracklore`](https://github.com/MattRahmeier/tracklore) — **privado por enquanto**; tornar público antes de ativar o Pages (plano gratuito exige).
- [x] **Streaming:** só links diretos do álbum (`links`), conferidos por `scripts/verificar-links.js`; sem link, sem botão. YouTube Music sempre pela playlist oficial do álbum. Botões em ordem de popularidade do serviço: Spotify, YouTube Music, Apple Music, Deezer, Tidal, Qobuz, Bandcamp (MIDiA 2025 e dados do Brasil; `js/componentes/card-album.js`). *(Revisto em 26/10/2026: antes era híbrido, com link de busca.)*
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
- [x] Seta de voltar à esquerda do título de cada página (`js/componentes/titulo.js`). Nas páginas de gênero do Guia: ← volta ao gênero mestre e ↑ sobe para o gênero logo acima.
- [x] Esqueleto: `index.html`, barra lateral (vira navegação inferior no celular), tokens em `css/tokens.css`, rotas por hash em `js/app.js` (`#/trackmap`, `#/curadoria`, `#/recomendados`, `#/busca`; parâmetros extras, ex. `#/trackmap/heavy-metal`), carregamento de dados em `js/dados.js`, uma vista por área em `js/vistas/`.
- [ ] Layout final com tema escuro refinado.
- [x] Ícones das plataformas (sprite em `index.html`: Spotify, YouTube, Qobuz, Apple Music, Deezer, Tidal, Bandcamp).
- [x] Componente de card de álbum (`js/componentes/card-album.js`): capa, título, artista · ano e botões só para links diretos conferidos (ícone do YouTube Music para a playlist do álbum). Em uso nas páginas de gênero do Guia de Gêneros.

## Fase 3 — Visão de Cérebro (TrackMap; endereço `#/trackmap` desde 28/10/2026, `#/cerebro` redireciona)
- [x] Ligações de influência do Musicmap (`scripts/buscar-musicmap.js`, mapa à mão em `data/generos/musicmap-mapa.json`): 134 gêneros mapeados, 148 influências novas além de origens e similares.
- [x] Grafo D3 (`js/vistas/cerebro.js`): começa com os 7 mestres ligados pela linha-guia da linhagem (só as origens dos próprios mestres); clicar abre os subgêneros diretos (de novo em cada um; clicar no gênero aberto recolhe); só fica aberto o caminho até o gênero clicado, e fechar o pop-up volta aos mestres. Subgêneros saem de dentro do círculo do pai num leque virado para fora do mapa (posições fixas, com espaço para o nome; o mestre aberto empurra os vizinhos; o enquadramento mostra o leque inteiro); os gêneros não fogem do mouse e a área de toque tem no mínimo ~22 px na tela sem invadir o vizinho (28/10/2026). Cor pela profundidade: mestre preto, subgêneros em cinzas cada vez mais claros até quase branco; o gênero aberto ganha um anel. Círculos crescem com o número de subgêneros contidos, que aparece dentro ("X subgêneros" nos mestres, só o número nos subgêneros). Linhas de subgênero, origem (vai até o ancestral visível) e influência/similar; flutuação leve e afastamento do mouse (parado com "reduzir movimento"); zoom e arraste.
- [x] Pop-up do gênero (off-white, à direita; no celular sobe de baixo): caminho, nome (coroa no mestre), década, subgêneros e álbuns, botão **"Ir para as recomendações"** com o número de álbuns do gênero (`#/recomendados/<gênero>`), resumo com fonte, chips de subgêneros, "Vem de" e "Ligado a".
- [x] Links de gênero dentro do resumo (e os chips) navegam até o gênero citado: centraliza, expande e abre o pop-up, sem recarregar a vista; `#/trackmap/<gênero>` abre direto no gênero.
- [ ] Pelo menos 10 álbuns em cada gênero do mapa (28/10/2026): charts de rock, pop, metal, hip-hop e jazz transcritos ou selecionados (seleções marcadas com `transcricao.parcial`); subgêneros sem chart próprio recebem os discos pelos estilos do Wikidata/MusicBrainz (`classificar-albuns.js`). Etiquetas de estilo nos cards somam charts e estilos.
- [ ] "Mais informações": playlist e álbuns essenciais dentro do pop-up.
- [ ] Busca de gênero no mapa; links "Saiba mais" (RYM, Musicmap) conferidos.

## Fase 4 — A Curadoria (antes "Curadoria da Semana"; renomeada em 28/10/2026)
- [x] Página centralizada em duas colunas: o texto e, à direita, o "Histórico" (editoriais, entrevistas e notícias, pelo campo `tipo` da edição; fixo ao rolar). Abaixo de 1100 px, o histórico vai para baixo do texto.
- [x] Edições em formato de editorial sobre faixas: atalhos para cada faixa, "player" com a capa (abre a ficha), nome da faixa, links para ouvir em outra aba e "Tocar aqui" (player do Spotify/YouTube embutido), e o texto do autor. Horizontal no computador, vertical no celular.
- [x] Edição #1 "Músicas com Introduções Impactantes" (editorial do Notion, 28/10/2026).
- [x] Carregar a edição mais recente por data de `data/curadorias/` + arquivo de edições anteriores.
- [ ] Bio, foto e redes do autor (campo `autor`, opcional).
- [ ] Validação simples da edição (5 álbuns, IDs existentes, redes conhecidas) num script em `scripts/`.
- [ ] Primeira edição de exemplo para testar o layout; a real vem de um autor convidado.

## Fase 5 — Recomendados pela Internet
- [x] Lista de gêneros com a mesma árvore do TrackMap (`js/arvore.js`): um bloco por mestre (com coroa), um card por gênero, sem sublistas (cada subgênero logo depois do gênero de onde saiu; o card mostra a década e quantos álbuns tem); irmãos em ordem cronológica e, na mesma década, em cadeia de proximidade (origens/similares). Gêneros com lista de álbuns ficam destacados.
- [x] Página do gênero mestre mostra também os álbuns de todos os subgêneros. Um disco pode estar em vários gêneros; cada card tem botões quadrados para os outros gêneros em que ele está (`card-etiqueta`).
- [ ] Fotos nos cards de gênero.
- [x] Página do gênero (`#/recomendados/<gênero>`): caminho na árvore, nome (coroa se for mestre), resumo com links e fonte, subgêneros, álbuns da lista e o disclaimer no fim. A interface não cita o site de origem das listas.
- [x] Caixa lateral do álbum ao clicar na capa (`js/componentes/painel-album.js`): lançamento, duração, nº de faixas, tipo, links de streaming com nome e fonte (MusicBrainz). Pop-up off-white à direita; no celular, sobe de baixo. Fecha com ×, Esc ou clique fora.
- [x] Caixa lateral: "Sobre este álbum" (Wikipédia) e "O que a crítica disse" (até 2 notas positivas em estrelas, com link da crítica), por `scripts/buscar-sobre-albuns.js`. A lista de faixas saiu da caixa por enquanto (continua na ficha).
- [x] Textos em inglês (165 "sobre", 7 resumos e 55 "como soa") traduzidos para o português, com aviso de tradução e link para o original.
- [x] Caixa lateral: "Faixa destaque" (média de popularidade no Deezer, no YouTube Music e no ListenBrainz, com links para a faixa) logo abaixo dos dados; os links do álbum ("Ouça o álbum") foram para depois da crítica. Fonte citada uma vez só.
- [x] Todas as fichas com lançamento, duração, gravadora e faixas (`scripts/completar-fichas.js`; validador exige os quatro).
- [x] Fichas sem lacunas: capas (busca de imagem quando preciso, com a fonte no rodapé), "sobre" em todas (Wikipédias em outros idiomas ou descrição montada com os dados), notas extras do Pitchfork e do Discogs.
- [x] Notas extras também do Metacritic. Testados e fora por bloquearem robôs ou não terem as notas: AllMusic, Album of the Year, Angry Metal Guy, Sputnikmusic, Wikidata.
- [x] Botão do registro mestre no Discogs na caixa do álbum (`scripts/buscar-discogs.js`) e botão de copiar "Artista - Álbum" sobre a capa.
- [x] 16 charts de eletrônica transcritos (22 no total, 704 álbuns). Discos que aparecem em mais de um chart ficam em todos, com botões para os outros gêneros.
- [x] Notas do RYM (usuários) via Claude in Chrome para 20 dos 25 álbuns sem crítica (`data/albuns/notas-rym.json`, `scripts/aplicar-notas-rym.js`).
- [x] Estrelas arredondadas sempre para cima, de meia em meia.
- [ ] 5 álbuns seguem sem nota: não têm a mesma edição no RYM (Statesboro Blues, Boss Bird!, Avalon Blues, So Many Roads ao vivo, The New York Sessions).
- [ ] Caixa lateral: tags.
- [ ] "Gêneros similares" no fim da página do gênero.

## Fase 6 — Ache o Seu Som!
- [x] Índice de busca no cliente: álbum, artista, gênero e ano, com resultados a cada tecla (`js/vistas/busca.js`).
- [x] Descritores como mais um campo da busca (01/11/2026): vocabulário no estilo dos descriptors do RYM (`data/descritores/`), preenchido pelas tags do MusicBrainz e do Last.fm (`scripts/buscar-descritores.js`); chips "Ou por um clima" na pesquisa vazia e etiquetas no painel do álbum.
- [ ] Copiar "Artista – Álbum", seleção múltipla, exportar .txt / clipboard.

## Fase 7 — Mobile e polimento
- [ ] Swipe esquerda/direita, layout empilhado.
- [ ] Performance do grafo, acessibilidade, publicação.
