# Roadmap

## Fase 0 — Decisões (fechadas em 26/10/2026)
- [x] **Stack:** site estático (HTML/CSS/JS puro, sem build) + **D3** para o grafo da Visão de Cérebro.
- [x] **Hospedagem:** GitHub Pages, repositório [`MattRahmeier/musique-scout`](https://github.com/MattRahmeier/musique-scout) — **privado por enquanto**; tornar público antes de ativar o Pages (plano gratuito exige).
- [x] **Streaming:** híbrido — link direto do álbum quando estiver no JSON (`links`); sem ele, o botão abre a busca "Artista Álbum" na plataforma.
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
- [ ] Revisão da árvore pelo usuário (nomes, hierarquia, o que falta ou sobra).
- [x] Índice das 541 Essential Charts (`data/charts/mu-essential-charts.json`) e imagens baixadas em `fontes/mu-charts/` (`scripts/baixar-charts.js`).
- [x] Primeiros charts transcritos (`data/charts/mu/`), um por mestre: Blues, Post-Punk 1, Synth Pop, Black Metal, IDM, Hip Hop 1 e Jazz — 291 álbuns, 10 itens a conferir (`scripts/validar-charts.js`).
- [ ] Revisão das transcrições pelo usuário (status `revisar` → `conferido`).
- [ ] Transcrever os demais charts ligados à árvore.
- [x] Fichas dos 288 álbuns dos 7 charts (`data/albuns/albuns.json`, `scripts/criar-fichas.js`): metadados, faixas, capa (281) e links de streaming do MusicBrainz; correções manuais em `data/albuns/correcoes.json`; 8 a conferir (`scripts/validar-albuns.js`).
- [ ] Fichas de álbuns: `sobre`, tags, 2 reviews positivos.
- [ ] Scripts de coleta/validação em `scripts/`.

## Fase 2 — Base do site
- [x] Esqueleto: `index.html`, barra lateral (vira navegação inferior no celular), tokens em `css/tokens.css`, rotas por hash em `js/app.js` (`#/cerebro`, `#/curadoria`, `#/recomendados`, `#/busca`; parâmetros extras, ex. `#/cerebro/heavy-metal`), carregamento de dados em `js/dados.js`, uma vista por área em `js/vistas/`.
- [ ] Layout final com tema escuro refinado.
- [x] Ícones das plataformas (sprite em `index.html`: Spotify, YouTube, Qobuz, Apple Music, Deezer, Tidal, Bandcamp).
- [x] Componente de card de álbum (`js/componentes/card-album.js`): capa, título, artista · ano e botões de streaming — preenchidos com link direto, contornados quando abrem a busca. Em uso nas páginas de chart do Guia de Gêneros (`#/recomendados/<chart>`).

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
- [ ] Grade de cards de gênero.
- [x] Página do chart (`#/recomendados/<chart>`): só o nome do gênero e o resumo dele (com links e fonte), grade de cards e o disclaimer no fim. A interface não cita o site de origem das listas.
- [x] Caixa lateral do álbum ao clicar na capa (`js/componentes/painel-album.js`): lançamento, duração, nº de faixas, tipo, links de streaming com nome, lista de faixas e fonte (MusicBrainz). Pop-up off-white à direita; no celular, sobe de baixo. Fecha com ×, Esc ou clique fora.
- [ ] Caixa lateral: sobre (Wikipédia), 2 reviews com estrelas, tags.
- [ ] "Gêneros similares" no fim da página do chart.

## Fase 6 — Ache o Seu Som!
- [ ] Índice de busca no cliente; filtros álbum/artista/faixa.
- [ ] Copiar "Artista – Álbum", seleção múltipla, exportar .txt / clipboard.

## Fase 7 — Mobile e polimento
- [ ] Swipe esquerda/direita, layout empilhado.
- [ ] Performance do grafo, acessibilidade, publicação.
