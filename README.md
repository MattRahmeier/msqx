# Tracklore

**Curadoria Humana Organizada por IA.**

Site de curadoria musical que organiza a história e a catalogação dos gêneros numa visão de "segundo cérebro": um mapa de gêneros mestres e subgêneros interligados, charts recomendados pela internet e uma busca interna de álbuns.

> Status: **dados em montagem (Fase 1) e esqueleto do site pronto; as áreas ainda estão em construção.**

## Rodar localmente

O site é estático, mas precisa de um servidor (os dados são carregados com `fetch`). Da pasta `Projetos`:

```bash
node .claude/serve.js sites/tracklore 5175
```

e abra http://localhost:5175. Scripts de dados ficam em `scripts/` (ver `docs/modelo-de-dados.md`).
> Fonte da especificação: página "Musique Scout" no Notion (copiada e organizada em `docs/`).

## Estrutura

```
tracklore/
├─ README.md            este arquivo
├─ CLAUDE.md            guia rápido para sessões de desenvolvimento
├─ docs/
│  ├─ especificacao.md  as 4 áreas do site + diretrizes visuais (do Notion)
│  ├─ referencias.md    sites de referência e fontes de dados
│  ├─ modelo-de-dados.md  formato proposto dos JSON de gêneros, charts e álbuns
│  └─ roadmap.md        fases de trabalho e decisões em aberto
├─ data/
│  ├─ generos/          árvore de gêneros e descrições (Visão de Cérebro)
│  ├─ curadorias/       uma edição por semana (Curadoria da Semana); _modelo.json para copiar
│  ├─ charts/           charts por gênero (Recomendados pela Internet)
│  └─ albuns/           ficha de cada álbum (datas, reviews, tags, links)
├─ assets/
│  ├─ img/generos/      fotos que representam cada gênero
│  ├─ img/capas/        capas de álbuns/playlists
│  ├─ img/autores/      fotos dos autores convidados
│  └─ icones/           ícones de plataformas (Spotify, YouTube, Qobuz…)
├─ index.html           página única do site
├─ css/                 tokens.css (cores, tipografia) e base.css
├─ js/                  app.js (rotas), dados.js (JSON), vistas/ (uma por área)
├─ scripts/             coleta, geração e validação de dados
└─ fontes/              material de referência baixado (fora do git), ex.: mu-charts/
```

## Áreas do site

1. **Visão de Cérebro** (página inicial): grafo animado de gêneros → subgêneros, com pop-up de informações e "Mais informações" (playlist + álbuns essenciais).
2. **Curadoria da Semana**: seleção semanal de um autor convidado — texto, cinco álbuns, bio curta e redes sociais. Editada à mão em `data/curadorias/`.
3. **Recomendados pela Internet**: versão interativa das Essential Charts do /mu/, com cards de gênero e ficha de cada álbum.
4. **Ache o Seu Som!**: busca unificada (nome, gênero, data, vibe) de álbuns/artistas/faixas, com seleção múltipla e exportação.
