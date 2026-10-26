# Roadmap

## Fase 0 — Decisões (fechadas em 26/10/2026)
- [x] **Stack:** site estático (HTML/CSS/JS puro, sem build) + **D3** para o grafo da Visão de Cérebro.
- [x] **Hospedagem:** GitHub Pages, repositório [`MattRahmeier/musique-scout`](https://github.com/MattRahmeier/musique-scout) — **privado por enquanto**; tornar público antes de ativar o Pages (plano gratuito exige).
- [x] **Streaming:** híbrido — link direto do álbum quando estiver no JSON (`links`); sem ele, o botão abre a busca "Artista Álbum" na plataforma.
- [x] **Escopo do piloto:** gêneros mestres **Blues, Rock, Metal, Eletrônica e Hip Hop**, com subgêneros e ~5 charts completos.
  - Gêneros mestres também têm linhagem entre si: **Blues → Rock → Metal**. Essas origens aparecem no cérebro como uma **linha-guia de conexão** (ver `modelo-de-dados.md`, campo `origens`).
- [x] **RateYourMusic:** leitura pelo **Claude in Chrome**, com a sessão do usuário, em ritmo humano e só páginas pontuais. CAPTCHA/verificação do Cloudflare é resolvido pelo usuário, nunca pelo Claude.
- [x] **Imagens:** capas via API (Cover Art Archive / Discogs), salvas em `assets/img/capas/`; fotos de gênero de fontes livres (Unsplash, Wikimedia Commons) com crédito em `data/creditos.json`.

## Fase 1 — Dados
- [ ] Árvore de gêneros (mestres → subgêneros) com resumos e similares.
- [ ] Charts das Essential Charts transcritos para JSON.
- [ ] Fichas de álbuns: metadados, tags, 2 reviews positivos, links.
- [ ] Scripts de coleta/validação em `scripts/`.

## Fase 2 — Base do site
- [ ] Layout com barra lateral, tema escuro, tokens de cor/tipografia.
- [ ] Ícones das plataformas.
- [ ] Componente de card de álbum (capa + botões de streaming).

## Fase 3 — Visão de Cérebro
- [ ] Grafo animado, expansão por clique, hover.
- [ ] Pop-up de gênero + "Mais informações" (playlist e álbuns).

## Fase 4 — Recomendados pela Internet
- [ ] Grade de cards de gênero.
- [ ] Página do chart com ficha do álbum, disclaimer e "Gêneros similares".

## Fase 5 — Ache o Seu Som!
- [ ] Índice de busca no cliente; filtros álbum/artista/faixa.
- [ ] Copiar "Artista – Álbum", seleção múltipla, exportar .txt / clipboard.

## Fase 6 — Mobile e polimento
- [ ] Swipe esquerda/direita, layout empilhado.
- [ ] Performance do grafo, acessibilidade, publicação.
