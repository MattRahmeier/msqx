# Especificação — MusiqueScout

Organizado a partir da página "Musique Scout" do Notion (26/10/2026).

## Navegação geral

- O site abre na **Visão de Cérebro**.
- Barra de navegação lateral com menus para as quatro áreas, nesta ordem: Visão de Cérebro, Curadoria da Semana, Recomendados pela Internet, Ache o Seu Som!
- Navegação rápida: ir de um lugar a outro e destrinchar um gênero em poucos cliques.

## 1 — Visão de Cérebro

Grafo gigante de interconexões entre **gêneros mestres** (originários) e seus **subgêneros**.

- Gêneros mestres ligados pela linhagem histórica (ex.: Blues → Rock → Metal) com uma **linha-guia de conexão** sempre visível, distinta das linhas de subgênero.
- Linhas animadas com leve flutuação; reagem/movem-se quando o mouse passa por cima.
- Clicar num gênero (ex.: "Heavy Metal") expande círculos menores com seus subgêneros diretos; cada subgênero pode ser expandido de novo.
- Ao clicar num gênero, abre ao lado um **pop-up** (animação simples) com um resumo do gênero, baseado na primeira linha da Wikipédia, RateYourMusic, Discogs, Encyclopaedia Metallum e outros sites especializados.
  - Os resumos são **sempre conteúdo escrito por pessoas**, nunca texto próprio da IA. Fonte principal: Wikipédia (licença CC BY-SA), com link "Fonte: Wikipédia" no pop-up. Texto de sites especializados com direitos reservados (RYM, AllMusic, Metallum, Musicmap) não é copiado; esses sites entram como link "Saiba mais".
- Botão **"Mais informações"**: amplia o pop-up (mantendo o cérebro visível) e oferece:
  - uma playlist com músicas importantes do gênero;
  - os melhores/mais famosos álbuns do gênero.
  - Cada item mostra a capa com dois botões internos: **Spotify** e **YouTube**.

## 2 — Curadoria da Semana

Página logo após a Visão de Cérebro (segundo item da barra lateral). Alimentada **manualmente** por um autor convidado a cada semana.

- **Texto** do autor sobre a seleção (tema, contexto, por que esses discos).
- **Cinco álbuns**, cada um com capa, artista, ano e botões de streaming (mesmo card das outras áreas, com ícones). Opcional: uma frase do autor sobre cada álbum.
- **Bio curta do autor**, com foto.
- **Redes sociais do autor**, como ícones com link (Instagram, X, Bluesky, RYM, Last.fm, site etc.).
- Edições anteriores ficam acessíveis num arquivo simples (lista por data) no fim da página.

## 3 — Recomendados pela Internet

Versão interativa das [Essential Charts do /mu/](https://4chanmusic.miraheze.org/wiki/Essential_Charts).

### Página de listagem
- Um card por gênero com **foto real** que represente o estilo (estilo Spotify).
- Todos os cards do mesmo tamanho e da mesma forma (sem variações de formato); no celular, empilhados um embaixo do outro.
- Usar apenas nomes reais de gêneros.
- Afastar-se visualmente da referência, mantendo a ideia.

### Página do chart (ao clicar num card)
- Menu interativo de capas, como num app de música.
- Clicar numa capa abre uma caixa ao lado com:
  - data de lançamento, artista principal, duração do disco;
  - informações do álbum (Wikipédia ou sites relevantes);
  - **dois reviews positivos** encontrados na internet, com nota convertida em **estrelas**;
  - **tags** de clima/mood/feeling/linguagem no estilo RYM (ex.: dark, ambient, hypnagogic);
  - botões para ouvir no **YouTube, Qobuz, Spotify** ou onde estiver disponível — sempre com ícones.
- **Disclaimer**: listas curadas por usuários da internet; podem não refletir a totalidade do gênero, mas são um bom ponto de partida.
- No final: **"Gêneros similares"** com dois botões interativos levando a gêneros relacionados.

## 4 — Ache o Seu Som!

Motor de busca interno sobre os álbuns recomendados, com resultados rápidos.

- Campo de pesquisa **unificado**, aceitando: nome, gênero, data de lançamento, palavras-chave de vibe (dark, ambient…).
- Seletor de tipo: **álbuns / artistas / músicas (faixas)**.
- Cada resultado oferece:
  - links para as plataformas de streaming (mesmo padrão das outras áreas);
  - botão para **copiar "Artista – Álbum"**;
  - **checkbox** sobre a capa para seleção múltipla.
- Exportar a seleção de uma vez: **arquivo .txt** ou **copiar para a área de transferência**.

## Diretrizes visuais

- Aparência moderna e minimalista, poucas cores; referência: Spotify, Qobuz.
- Tema escuro: fundo **preto-concreto** (ou levemente mais claro), texto **branco**, pop-ups em **off-white** que combine.
- Mobile: navegação fácil com **swipe** (esquerda/direita) e visual minimalista de player de música.

## Imagens de referência no Notion

A página do Notion tem duas imagens que não foram copiadas para cá:
1. Mockup da Visão de Cérebro (seção 1).
2. Exemplo dos cards de gênero das Essential Charts (seção 2).
