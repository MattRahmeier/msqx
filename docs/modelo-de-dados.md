# Modelo de dados (proposta)

Arquivos JSON estáticos em `data/`, lidos pelo site no navegador. Os IDs são `kebab-case`.

## `data/generos/generos.json`

```json
{
  "id": "metal",
  "nome": "Metal",
  "pai": null,
  "mestre": true,
  "decada": 1960,
  "origens": ["rock", "hard-rock", "blues-rock", "psychedelic-rock"],
  "resumo": "Primeira frase descritiva do gênero.",
  "fontes": ["https://en.wikipedia.org/wiki/Heavy_metal_music"],
  "similares": ["rock", "eletronica"],
  "playlist": { "spotify": "", "youtube": "" },
  "albunsEssenciais": ["black-sabbath-paranoid"],
  "imagem": "assets/img/generos/metal.jpg"
}
```

- `resumo` — **sempre texto escrito por pessoas, nunca gerado por IA.** Vem das primeiras frases da Wikipédia (português; inglês quando não há artigo em português), copiadas sem alteração por `scripts/buscar-resumos.js`, com `resumoFonte` (`url`, `idioma`, `licenca: "CC BY-SA 4.0"`). Quando o artigo automático é vago ou errado, `resumoArtigo` (ex.: `"pt:Heavy metal tradicional"`) e `resumoFrases` escolhem outro artigo ou mais frases; `resumoArtigo: false` + `resumoPendente` marcam gêneros sem fonte adequada.
  - `resumoFonte.tipo: "parafrase"` — quando a fonte não tem licença livre (ex.: comentário do Reddit indicado pelo usuário), os pontos principais são reescritos com outras palavras e a fonte fica registrada (`url`, `autor`, `nota`). Sem `tipo`, o texto é cópia literal da Wikipédia. O site deve exibir "Baseado em: <fonte>" para paráfrases e "Fonte: Wikipédia" para cópias.
- `resumoLinks` — trechos do resumo que citam outro gênero: `[{ "de": 12, "ate": 22, "genero": "doom-metal" }]` (posições de `resumo.slice(de, ate)`). O texto do resumo não é alterado; o site monta os links a partir das posições. Gerado por `scripts/ligar-resumos.js` (use `--mostrar` para conferir) — rode após buscar ou editar resumos; o validador acusa links desatualizados.
- `nomesAlternativos` — outras formas como o gênero aparece nos textos (ex.: `"rock psicodélico"`, `"pós-punk"`), usadas para achar as menções. Espaço e hífen são equivalentes, então "hip hop" já cobre "hip-hop".
- `ligarPeloNome: false` — o nome do gênero não é procurado nos textos, só os alternativos. Usado em Eletrônica (o adjetivo "eletrônica" é comum) e Heavy Metal (no texto, "heavy metal" quase sempre significa o mestre Metal).
- `decada` — década aproximada de surgimento (ex.: `1980` = anos 1980). Serve para ordenar e contar a história no cérebro.
- `playlist`, `albunsEssenciais` e `imagem` são opcionais e entram em fases posteriores (álbuns e imagens).
- Rode `node scripts/validar-generos.js` após editar (acrescente `--wiki` para conferir os links da Wikipédia).

Três tipos de ligação, cada um com um estilo de linha próprio no cérebro:

- `pai` — hierarquia (mestre → subgênero). Abre ao clicar no gênero. Gêneros mestres têm `pai: null`.
- `origens` — linhagem histórica: de quais gêneros este surgiu. Vale também entre mestres (Blues → Rock → Metal) e desenha uma **linha-guia de conexão** sempre visível. Pode ter mais de uma origem.
- `similares` — parentesco estético; alimenta o bloco "Gêneros similares" e, opcionalmente, linhas tênues no grafo.

Piloto: mestres `blues`, `rock` (origens incluem `blues`), `pop`, `metal` (origens incluem `rock`), `eletronica`, `hip-hop` e `jazz` (subgêneros e ligações seguem o Musicmap). Origens fora do piloto (ex.: `disco`, `funk`, `soul`, `jazz`, `industrial`) ficam registradas mesmo que o gênero ainda não exista no JSON; o site ignora IDs ausentes e o validador só os lista como aviso.

A hierarquia (`pai`) e a linhagem (`origens`) são independentes: o Metal é mestre próprio (`pai: null`), mas tem o Rock entre suas origens; o Grindcore está sob o Metal, mas também vem do Hardcore Punk (Rock). Essas linhas cruzadas entre árvores são o que forma o "cérebro".

## `data/creditos.json`

```json
{ "arquivo": "assets/img/generos/blues.jpg", "autor": "", "fonte": "https://unsplash.com/...", "licenca": "Unsplash License" }
```

## `data/curadorias/` (Curadoria da Semana)

Uma edição por arquivo, nomeado `AAAA-MM-DD-<autor>.json` (data de publicação). O site mostra a edição mais recente cuja data já chegou; as demais formam o arquivo. Para criar uma edição, copie `data/curadorias/_modelo.json` e acrescente o `id` em `data/curadorias/indice.json` (o GitHub Pages não lista pastas, então o site precisa desse índice):

```json
["2026-11-02-fulano-de-tal", "2026-11-09-ciclana"]
```

```json
{
  "id": "2026-11-02-fulano-de-tal",
  "publicacao": "2026-11-02",
  "titulo": "Discos para ouvir de madrugada",
  "texto": "Texto do autor. Parágrafos separados por linha em branco.",
  "albuns": [
    { "album": "my-bloody-valentine-loveless", "nota": "Frase opcional do autor sobre o disco." }
  ],
  "autor": {
    "nome": "Fulano de Tal",
    "foto": "assets/img/autores/fulano-de-tal.jpg",
    "bio": "Bio curta, 2–3 frases.",
    "redes": [
      { "rede": "instagram", "url": "https://instagram.com/..." },
      { "rede": "rym", "url": "https://rateyourmusic.com/~..." }
    ]
  }
}
```

- `albuns` tem **exatamente 5** itens. `album` aponta para um ID de `data/albuns/`; se o disco ainda não existir lá, cadastrar a ficha dele (assim ele também entra na busca).
- `rede` usa um nome fixo (`instagram`, `x`, `bluesky`, `youtube`, `rym`, `lastfm`, `spotify`, `site`) para o site escolher o ícone.

## `data/charts/mu-essential-charts.json` (índice das Essential Charts)

Gerado por `node scripts/baixar-charts.js` a partir das galerias de https://4chanmusic.miraheze.org/wiki/Essential_Charts. Um item por chart:

```json
{
  "id": "black-metal-2",
  "titulo": "Black Metal 2",
  "secao": "Genres",
  "generos": ["black-metal"],
  "arquivoWiki": "Black Metal 2.jpg",
  "url": "https://static.miraheze.org/4chanmusicwiki/...",
  "bytes": 1234567, "largura": 1500, "altura": 1500,
  "imagemLocal": "fontes/mu-charts/black-metal-2.jpg",
  "fonte": "https://4chanmusic.miraheze.org/wiki/Essential_Charts"
}
```

- `secao`: `/mu/core`, `Genres`, `Countries` ou `Other`, como na wiki.
- `generos` é uma **sugestão automática** a partir do título (mesma regra dos links dos resumos); revisar ao transcrever.
- As imagens ficam em `fontes/mu-charts/`, **fora do git** (são colagens de capas com direitos reservados e somam ~780 MB). Servem de fonte para transcrever os álbuns de cada chart; o site exibe capas individuais (Cover Art Archive/Discogs), não as colagens.

## `data/charts/mu/<id>.json` (chart transcrito)

Um arquivo por chart; `id` igual ao do índice. Os álbuns são copiados da imagem, na ordem da grade:

```json
{
  "id": "blues",
  "titulo": "/mu/'s Essential Blues List",
  "indice": "blues",
  "generos": ["blues"],
  "fonte": "https://4chanmusic.miraheze.org/wiki/Essential_Charts",
  "imagem": "fontes/mu-charts/blues.jpg",
  "transcricao": { "data": "2026-10-26", "metodo": "lista escrita no próprio chart", "status": "revisar" },
  "nota": "Observações do próprio chart (opcional).",
  "albuns": [
    { "pos": "G4", "artista": "Skip James", "titulo": "Devil Got My Woman", "noChart": "Skip James Devil — Got My Woman" },
    { "pos": "h10", "artista": "Art Tatum", "titulo": null, "noChart": "art tatum genius etc.", "conferir": "título incompleto no chart" }
  ]
}
```

- `pos` segue a numeração do próprio chart (A1, 1-1, a10…).
- `noChart` guarda o texto original quando ele foi corrigido (erro de digitação, abreviação, título cortado). Só corrigimos o que é inequívoco.
- `conferir` marca o que não deu para confirmar pela imagem; `titulo: null` quando o álbum não foi identificado. Nada é inventado.
- Campos extras usados quando o chart traz a informação: `ano`, `subestilos` (ex.: cor da borda no chart de IDM), `inicio` (álbum de entrada recomendado).
- `transcricao.status`: `revisar` até alguém conferir com a imagem; depois `conferido`.
- Validação: `node scripts/validar-charts.js` (lista também os itens a conferir).
- Cada álbum identificado aponta para sua ficha pelo campo `album` (gravado por `scripts/criar-fichas.js`).

## `data/albuns/albuns.json` (fichas de álbum)

Um único arquivo com todas as fichas (a Pesquisa precisa de todas de uma vez). Gerado por `node scripts/criar-fichas.js` a partir dos charts transcritos; o script retoma de onde parou e `--refazer id1,id2` busca de novo.

```json
{
  "id": "celtic-frost-to-mega-therion",
  "titulo": "To Mega Therion",
  "artista": "Celtic Frost",
  "lancamento": "1985",
  "tipo": "Album",
  "duracao": "40:23",
  "faixas": [{ "n": 1, "titulo": "Innocence and Wrath", "duracao": "1:03" }],
  "links": { "spotify": "https://open.spotify.com/album/...", "qobuz": "...", "appleMusic": "...", "deezer": "...", "tidal": "..." },
  "capa": "assets/img/capas/celtic-frost-to-mega-therion.jpg",
  "musicbrainz": { "releaseGroup": "f2f954cb-...", "release": "9af4c0d9-..." },
  "charts": ["black-metal"],
  "generos": ["black-metal"]
}
```

- **Fontes:** MusicBrainz (banco aberto, mantido por pessoas) para título, artista, data, tipo, faixas e links; Cover Art Archive para a capa (500 px).
- `titulo`/`artista` são os do MusicBrainz; se não batem com o chart, a ficha ganha `conferir` com o que foi pedido e o que veio.
- `lancamento`: primeira data de lançamento do álbum (pode ser só o ano).
- `faixas` e `duracao`: da edição oficial mais antiga.
- `links`: links diretos encontrados em qualquer edição (as digitais costumam tê-los). Plataformas: `spotify`, `youtube`, `qobuz`, `bandcamp`, `appleMusic`, `deezer`, `tidal`. Sem link direto, o site monta o link de busca "Artista Álbum" (decisão da Fase 0).
- `charts` e `generos` são recalculados a partir dos charts a cada execução.
- `data/albuns/correcoes.json` fixa à mão o release-group certo quando a busca erra ou só acha o título com subtítulo: `{ "<id da ficha>": "<MBID do release-group>" }`; `null` marca álbum que não está no MusicBrainz. Depois de editar, rode `node scripts/criar-fichas.js --refazer <id>` (apague antes a capa antiga em `assets/img/capas/`).
- Validação: `node scripts/validar-albuns.js`.
- Ainda faltam (próximas etapas): `sobre` (texto da Wikipédia, com fonte), `tags` de clima/mood e `reviews` (dois positivos, com nota em `estrelas` de 0–5). A Pesquisa indexa `titulo`, `artista`, `faixas`, `generos`, `tags` e `lancamento`.
