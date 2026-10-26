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

- `decada` — década aproximada de surgimento (ex.: `1980` = anos 1980). Serve para ordenar e contar a história no cérebro.
- `playlist`, `albunsEssenciais` e `imagem` são opcionais e entram em fases posteriores (álbuns e imagens).
- Rode `node scripts/validar-generos.js` após editar (acrescente `--wiki` para conferir os links da Wikipédia).

Três tipos de ligação, cada um com um estilo de linha próprio no cérebro:

- `pai` — hierarquia (mestre → subgênero). Abre ao clicar no gênero. Gêneros mestres têm `pai: null`.
- `origens` — linhagem histórica: de quais gêneros este surgiu. Vale também entre mestres (Blues → Rock → Metal) e desenha uma **linha-guia de conexão** sempre visível. Pode ter mais de uma origem.
- `similares` — parentesco estético; alimenta o bloco "Gêneros similares" e, opcionalmente, linhas tênues no grafo.

Piloto: mestres `blues`, `rock` (origens incluem `blues`), `metal` (origens incluem `rock`), `eletronica` e `hip-hop`. Origens fora do piloto (ex.: `disco`, `funk`, `soul`, `jazz`, `industrial`) ficam registradas mesmo que o gênero ainda não exista no JSON; o site ignora IDs ausentes e o validador só os lista como aviso.

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

## `data/charts/<genero>.json`

```json
{
  "genero": "shoegaze",
  "titulo": "Shoegaze Essentials",
  "fonte": "https://4chanmusic.miraheze.org/wiki/Essential_Charts",
  "albuns": ["my-bloody-valentine-loveless"]
}
```

## `data/albuns/<id>.json` (ou um único `albuns.json`)

```json
{
  "id": "my-bloody-valentine-loveless",
  "titulo": "Loveless",
  "artista": "My Bloody Valentine",
  "lancamento": "1991-11-04",
  "duracao": "48:36",
  "generos": ["shoegaze"],
  "tags": ["dreamy", "noisy", "ethereal"],
  "sobre": "Resumo da Wikipédia ou fonte relevante.",
  "reviews": [
    { "fonte": "Pitchfork", "nota": 10, "escala": 10, "estrelas": 5, "trecho": "", "url": "" }
  ],
  "faixas": [{ "n": 1, "titulo": "Only Shallow", "duracao": "4:17" }],
  "links": { "spotify": "", "youtube": "", "qobuz": "" },
  "capa": "assets/img/capas/my-bloody-valentine-loveless.jpg"
}
```

`estrelas` = nota normalizada para 0–5 (meias estrelas permitidas). A busca (área 3) indexa `titulo`, `artista`, `faixas`, `generos`, `tags` e `lancamento`.
