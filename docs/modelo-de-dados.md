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
- `som` — como o gênero soa e quais elementos o definem (instrumentos, ritmo, timbre, voz, produção). Também texto da Wikipédia copiado sem alteração, por `scripts/buscar-som.js`: frases que falam do som, tiradas da seção de características ("Características", "Characteristics"…) ou, sem ela, da introdução; português primeiro, inglês depois. `somFonte` registra `url` (com a seção), `idioma`, `secao` e `licenca`; `somLinks` funciona como `resumoLinks`. O site mostra `som` logo depois do `resumo`, no mesmo parágrafo (descrição contínua), com as fontes embaixo. Ajustes: `somArtigo` (artigo/seção à mão, ou `false` + `somPendente` quando a Wikipédia não descreve o som), `somFrases` e `somPular` (pula frases como citações).
- `nomesAlternativos` — outras formas como o gênero aparece nos textos (ex.: `"rock psicodélico"`, `"pós-punk"`), usadas para achar as menções. Espaço e hífen são equivalentes, então "hip hop" já cobre "hip-hop".
- `ligarPeloNome: false` — o nome do gênero não é procurado nos textos, só os alternativos. Usado em Eletrônica (o adjetivo "eletrônica" é comum) e Heavy Metal (no texto, "heavy metal" quase sempre significa o mestre Metal).
- `decada` — década aproximada de surgimento (ex.: `1980` = anos 1980). Serve para ordenar e contar a história no cérebro.
- `playlist`, `albunsEssenciais` e `imagem` são opcionais e entram em fases posteriores (álbuns e imagens).
- Rode `node scripts/validar-generos.js` após editar (acrescente `--wiki` para conferir os links da Wikipédia).

Três tipos de ligação, cada um com um estilo de linha próprio no cérebro:

- `pai` — hierarquia (mestre → subgênero). Abre ao clicar no gênero. Gêneros mestres têm `pai: null`.
- `origens` — linhagem histórica: de quais gêneros este surgiu. Vale também entre mestres (Blues → Rock → Metal) e desenha uma **linha-guia de conexão** sempre visível. Pode ter mais de uma origem.
- `similares` — parentesco estético; alimenta o bloco "Gêneros similares" e, opcionalmente, linhas tênues no grafo.
- `tags` — etiquetas opcionais do gênero (ex.: `["brasileiro"]`). Aparecem no card do Guia e na página do gênero, e entram na Pesquisa: buscar "brasileiro" lista os gêneros com essa tag.
- `musicmap` e `influencias` — gravados por `node scripts/buscar-musicmap.js` a partir do mapa do [Musicmap](https://musicmap.info): `musicmap` é o código do nó equivalente (ex.: `met06`; três letras = supergênero, nos mestres), escolhido à mão em `data/generos/musicmap-mapa.json`; `influencias` são os gêneros nossos ligados por uma linha do Musicmap que ainda não estão em `pai`/`origens`/`similares`. Quando vários gêneros caem no mesmo nó, só o primeiro do mapa recebe as linhas. Só as ligações são usadas; nenhum texto do Musicmap é copiado. No TrackMap aparecem como linhas tênues de influência e no bloco "Ligado a" do pop-up.

Piloto: mestres `blues`, `rock` (origens incluem `blues`), `pop`, `metal` (origens incluem `rock`), `eletronica`, `hip-hop` e `jazz` (subgêneros e ligações seguem o Musicmap). Origens fora do piloto (ex.: `disco`, `funk`, `soul`, `jazz`, `industrial`) ficam registradas mesmo que o gênero ainda não exista no JSON; o site ignora IDs ausentes e o validador só os lista como aviso.

A hierarquia (`pai`) e a linhagem (`origens`) são independentes: o Metal é mestre próprio (`pai: null`), mas tem o Rock entre suas origens; o Grindcore está sob o Metal, mas também vem do Hardcore Punk (Rock). Essas linhas cruzadas entre árvores são o que forma o "cérebro".

## `data/creditos.json`

```json
{ "arquivo": "assets/img/generos/blues.jpg", "autor": "", "fonte": "https://unsplash.com/...", "licenca": "Unsplash License" }
```

## `data/curadorias/` (A Curadoria)

Uma edição por arquivo, nomeado `AAAA-MM-DD-<tema>.json` (data de publicação). Cada edição é um editorial sobre algumas faixas. O site mostra a edição mais recente cuja data já chegou; as demais formam o arquivo no fim da página (`#/curadoria/<id>` abre uma delas). Para criar uma edição, copie `data/curadorias/_modelo.json` e acrescente o `id` em `data/curadorias/indice.json` (o GitHub Pages não lista pastas, então o site precisa desse índice):

```json
["2026-10-28-introducoes-impactantes"]
```

```json
{
  "id": "2026-10-28-introducoes-impactantes",
  "tipo": "editorial",
  "numero": 1,
  "publicacao": "2026-10-28",
  "titulo": "Músicas com Introduções Impactantes",
  "autor": { "nome": "", "foto": "assets/img/autores/....jpg", "bio": "", "redes": [{ "rede": "instagram", "url": "" }] },
  "faixas": [
    {
      "faixa": "Airport Lady",
      "artista": "Toshiki Kadomatsu",
      "albumTitulo": "After 5 Clash",
      "album": "toshiki-kadomatsu-after-5-clash",
      "texto": ["Parágrafo do autor.", "Outro parágrafo."],
      "outras": ["Step into the Light", "After 5 Crash"],
      "links": { "spotify": "https://open.spotify.com/track/...", "deezer": "...", "youtubeMusic": "...", "appleMusic": "..." }
    }
  ]
}
```

- O texto é do autor, copiado como ele escreveu (no Notion, página TrackLore › Editoriais). Não é redigido pelo Claude; só se completa o que o próprio autor pedir no texto. Erros de digitação e ortografia são corrigidos quando o autor autoriza (edição #1: autorizado em 28/10/2026), sem mudar estilo nem conteúdo.
- Marcação no `texto`: `_palavra_` vira itálico (estrangeirismos e neologismos, ex.: `_groove_`, `_slappado_`); `[rock progressivo](g:progressive-rock)` vira link para a página do gênero no Guia de Gêneros (só gêneros da árvore; os outros ficam em texto); `[Sea Breeze](a:toshiki-kadomatsu-sea-breeze)` vira o nome do disco em itálico que abre a ficha dele. Discos citados no texto que não são de nenhuma faixa entram em `citados: [{ "artista", "titulo", "album" }]` para `criar-fichas.js` criar as fichas.
- `album` aponta para uma ficha de `data/albuns/`: `node scripts/criar-fichas.js` também cria as fichas dos discos das edições que não estão em nenhum chart. Tocar na capa do player abre essa ficha.
- `links` são os links da faixa (não do álbum): `node scripts/curadoria-faixas.js` procura no Deezer, YouTube Music, Spotify, Apple Music e Qobuz pelo álbum da ficha. Sem links da faixa, o player mostra os do álbum. "Tocar aqui" embute o vídeo da faixa no YouTube (YouTube Music da faixa; sem ele, a busca de músicas do YouTube Music). Quando o disco não está no catálogo oficial, `video: { "url": "https://www.youtube.com/watch?v=…", "nota": "upload de fã…" }` define o vídeo, só com aprovação do usuário.
- `autor` é opcional; sem ele, a edição não mostra assinatura.
- Edição de álbuns (`"formato": "albuns"`, ex.: edição #2): cada item é um disco, sem `faixa`; o player mostra o título do álbum e os links do álbum. `posicao` é o número dado pelo autor (ex.: contagem de 5 a 1); `grupo` abre uma seção (ex.: menções honrosas) cujos itens ficam sem número; `pais` (código ISO, ex.: `"BR"`) vira a bandeira ao lado do artista. Os discos entram também no Guia de Gêneros pela `tracklore-selecao`, com `fonte` apontando para a edição.
- Discos das faixas e de `citados` ganham, no Guia de Gêneros, a marca laranja (aspas) "Citado no nosso editorial" e, na ficha, a seção "Citado no editorial" (antes das notas), com link para a edição (`citacoesEditoriais()` em `js/dados.js`).
- `tipo`: `editorial` (padrão), `entrevista` ou `noticia` — separa as publicações no "Histórico" ao lado da página.
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
- `generos` em cada álbum (opcional): charts com listas por gênero (ex.: `metal-subgenres`, `post-punk-by-subgenre`) dizem o gênero de cada disco; sem o campo, vale o `generos` do chart.
- `emDestaque: true` num álbum: disco em destaque no gênero; a página do gênero o mostra primeiro, com a etiqueta "Em destaque".
- `data/charts/mu/tracklore-selecao.json` reúne as listas de gêneros sem chart do /mu/: `"indice": null`, curadoria do Tracklore, e cada disco tem `fonte` (o artigo da Wikipédia sobre o gênero que cita o artista).
- `transcricao.parcial: true`: seleção de parte do chart (curadoria do TrackMap, 10 a 16 discos por gênero), não a transcrição completa; o `metodo` diz como foi escolhida.
- `transcricao.status`: `revisar` até alguém conferir com a imagem; depois `conferido`.
- Validação: `node scripts/validar-charts.js` (lista também os itens a conferir).
- `data/charts/mu-transcritos.json` lista os ids dos charts transcritos, na ordem em que o Guia de Gêneros os mostra (o GitHub Pages não lista pastas). Acrescente o id ao transcrever um chart novo.
- `scripts/criar-fichas.js` lê todos os charts no início e os regrava no fim: não edite um chart enquanto ele roda, porque a edição se perde.
- Disco sem capa em nenhuma fonte: a capa pode ser recortada da imagem do próprio chart (`fontes/mu-charts/`) e gravada em `assets/img/capas/<id>.jpg`, com `capa` apontando para o arquivo.
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
  "gravadora": "Noise Records",
  "duracao": "40:23",
  "faixas": [{ "n": 1, "titulo": "Innocence and Wrath", "duracao": "1:03" }],
  "links": { "spotify": "https://open.spotify.com/album/...", "qobuz": "...", "appleMusic": "...", "deezer": "...", "tidal": "..." },
  "capa": "assets/img/capas/celtic-frost-to-mega-therion.jpg",
  "musicbrainz": { "releaseGroup": "f2f954cb-...", "release": "9af4c0d9-..." },
  "charts": ["black-metal"],
  "generos": ["black-metal"],
  "estilos": ["doom-metal"],
  "estilosFonte": { "doom-metal": "wikidata" }
}
```

- `estilos` / `estilosFonte`: gêneros da árvore que fontes abertas atribuem ao álbum além dos que vêm dos charts — o gênero (P136) do item do Wikidata e os gêneros mais votados do release-group no MusicBrainz (`node scripts/buscar-generos-albuns.js` coleta em `fontes/generos-albuns.json`; `node scripts/classificar-albuns.js` grava). Ancestrais de gêneros que o disco já tem ficam de fora, e Música Clássica e seus subgêneros nunca vêm daqui: só recebem discos postos à mão nos charts (trilhas e discos orquestrados de outros gêneros ficam só no próprio catálogo). O site soma `generos` e `estilos` para pôr o disco nas listas dos gêneros e nas etiquetas de estilo dos cards.

- **Fontes:** MusicBrainz (banco aberto, mantido por pessoas) para título, artista, data, tipo, faixas e links; Cover Art Archive para a capa (500 px).
- Todas as fichas têm `lancamento`, `duracao`, `gravadora` e `faixas` (com duração) — o validador acusa o que faltar. Quando o MusicBrainz não tem o dado, `node scripts/completar-fichas.js` busca em outra edição do MusicBrainz, no Deezer ou no quadro do álbum na Wikipédia, e registra a origem em `complementos` (`{ "duracao": "deezer", "gravadora": "wikipedia" }`). O que ainda faltar, `node scripts/completar-discogs.js` busca no Discogs (link da ficha ou busca com o token pessoal na variável de ambiente `DISCOGS_TOKEN`, nunca gravado no projeto); origem `"discogs"`. Lançamento pelo próprio artista ("Not On Label … Self-released") vira a gravadora "Lançamento independente". Dados conferidos à mão ficam em `correcoes.json` (campos `lancamento`, `gravadora` e `fonte`).
- Links e capas que faltam: `node scripts/completar-links.js` procura o álbum no Deezer e no iTunes (mesmo título e artista) e baixa a capa quando falta; depois rode `verificar-links.js` e `buscar-destaques.js` com `--refazer` nos ids que ele imprime.
- `sobre` também pode vir de Wikipédias em outros idiomas (es, fr, de, it…, via Wikidata), traduzido; o crédito diz o idioma ("Traduzido do espanhol", "Wikipédia em espanhol"). `correcoes.json` aceita `sobreArtigo` (`"en:Dr. Octagonecologyst"`) para fixar o artigo.
- `capaFonte`: endereço da imagem quando a capa foi trocada à mão (por exemplo, indicada pelo usuário), em vez de vir do Cover Art Archive.
- `descritores`: ids do vocabulário de `data/descritores/descritores.json` (termos no estilo dos descriptors do RYM, com nome em português e categoria: clima (na tela, "vibe"), som, voz, letra, forma). Vêm das tags dos ouvintes — MusicBrainz (tags do release-group com 2+ votos) e Last.fm (tags do álbum e da faixa destaque com peso ≥ 10; chave em `LASTFM_API_KEY`, nunca gravada) — por `node scripts/buscar-descritores.js`. `descritoresFonte` lista as fontes consultadas. Do RYM só a lista de termos é usada. A Pesquisa encontra discos pelo descritor em português ou em inglês; o painel do álbum mostra os descritores.
- `capaExplicita: true`: capa com imagem explícita (violência, gore, automutilação, nudez). O site mostra a capa borrada com o botão "Conteúdo explícito, clique para revelar"; marcada à mão, depois de olhar a capa (primeira leva em 29/10/2026: capas de metal, extremo, industrial, noise, horrorcore e casos conhecidos).
- `titulo`/`artista` são os do MusicBrainz; se não batem com o chart, a ficha ganha `conferir` com o que foi pedido e o que veio.
- `lancamento`: primeira data de lançamento do álbum (pode ser só o ano).
- `gravadora`: a gravadora que mais aparece nas edições oficiais do álbum no MusicBrainz (no empate, a da edição mais antiga; `null` quando não consta). Fichas antigas: `node scripts/buscar-gravadoras.js`.
- `faixas` e `duracao`: da edição oficial mais antiga.
- `links`: links diretos do álbum. Plataformas: `spotify`, `youtubeMusic`, `qobuz`, `bandcamp`, `appleMusic`, `deezer`, `tidal`. Os do MusicBrainz vêm de qualquer edição; `youtubeMusic` é a playlist oficial do álbum (`music.youtube.com/playlist?list=OLAK5uy_…`), achada pela busca de álbuns do YouTube Music com o mesmo artista e título. **Sem link, sem botão** — o site não monta links de busca.
- `linksVerificados`: data da última verificação por `node scripts/verificar-links.js`, que apaga os links quebrados (Spotify pelo oEmbed, Deezer pela API, Apple Music, Tidal e Qobuz pela página; o Qobuz responde pela loja do Brasil). O Bandcamp não é conferido: bloqueia acesso automatizado.
- `charts` e `generos` são recalculados a partir dos charts a cada execução.
- `data/albuns/correcoes.json` fixa à mão o release-group certo quando a busca erra ou só acha o título com subtítulo: `{ "<id da ficha>": "<MBID do release-group>" }`; `null` marca álbum que não está no MusicBrainz; `{ "releaseGroup": "<MBID>", "titulo": "Computer World" }` também troca o título (ou `artista`) exibido, quando o do MusicBrainz não é o usual. Depois de editar, rode `node scripts/criar-fichas.js --refazer <id>` (apague antes a capa antiga em `assets/img/capas/`).
- Validação: `node scripts/validar-albuns.js`.
- `sobre`: primeiras frases do artigo do álbum na Wikipédia (português; senão inglês), copiadas sem alteração, com `sobreFonte` (`url`, `idioma`, `licenca`). O artigo vem do Wikidata ligado ao release-group no MusicBrainz ou, sem ele, de uma busca conferida pelo quadro do álbum. `sobrePendente` quando não há artigo.
- `reviews`: até duas notas positivas (`estrelas` >= 3,5) do quadro "Professional ratings" do artigo em inglês: `{ "fonte": "AllMusic", "nota": "4.5/5", "estrelas": 4.5, "url": "<crítica>", "via": "<artigo>#Critical_reception" }`. Só veículo, nota e link — o texto das críticas tem direitos reservados. `estrelas` vai de meia em meia e é sempre arredondada para cima (3,29/5 → 3,5; 8,2/10 → 4,5) — decisão do usuário; o corte de 3,5 vale sobre o valor arredondado. Notas em letra (A, B+…) viram estrelas por tabela; `url` é `null` quando a referência não tem link.
- Textos traduzidos: quando o original só existe em inglês, o texto (`resumo`, `som` ou `sobre`) é a tradução em português e a fonte ganha `traduzido: true` (com `idioma: "en"` e o link do original). O site mostra "Traduzido do inglês" e, na linha de baixo, "Original: Wikipédia em inglês". O texto em inglês não é guardado. Aplicar com `node scripts/aplicar-traducoes.js arquivo.json` (chaves `resumo:<gênero>`, `som:<gênero>`, `sobre:<álbum>`); buscar de novo um item traduzido traz o inglês de volta.
- `destaque`: a faixa mais popular do álbum pela média de Deezer (`rank`), YouTube Music (reproduções) e ListenBrainz (audições reunidas de vários serviços de streaming); em cada plataforma a nota é o valor da faixa ÷ o maior do álbum ali. O site mostra só "A faixa mais popular do álbum nos streamings." `{ "titulo": "Dear Mama", "duracao": "4:40", "links": { "spotify": "…/track/…", "youtubeMusic": "…watch?v=…", "appleMusic": "…?i=…", "qobuz": "…/track/…", "deezer": "…/track/…" }, "criterio": "A faixa mais popular do álbum nos streamings.", "plataformas": ["youtubeMusic", "deezer", "listenbrainz"] }`. Só faixas da lista da ficha contam (evita faixas bônus). Os links de Spotify, Apple Music e Qobuz são procurados pelo título da faixa nos álbuns da ficha (`--links` refaz só essa parte); Tidal e Bandcamp não têm dados públicos das faixas. Ficaram de fora o Spotify (a API exige Premium) e Apple Music, Tidal e Qobuz (sem dados públicos de popularidade por faixa). Gerado por `node scripts/buscar-destaques.js` (`--refazer id`, `--todos`); `destaqueVerificado` guarda a data.
- `reviews` também vêm de `node scripts/buscar-criticas-extras.js` (fichas com menos de duas notas): Pitchfork (`url` da resenha), Metacritic (Metascore de 0 a 100, `url` da página de críticas; confere artista, título e ano ±1) e Discogs (`"fonte": "Discogs (usuários)"`, média dos usuários com `votos` ≥ 10). Sem `via`: o crédito da Wikipédia só aparece quando alguma nota veio de lá.
- `naoOficial`: `{ url, tipo: "album" | "faixa" | "obra" | "artista", titulo, canal }` — upload de fã no YouTube para fichas **sem nenhum link oficial** (`node scripts/buscar-nao-oficiais.js`, pedido do usuário em 28/10/2026): o álbum completo (título com artista e álbum, ≥ 60% da duração) ou, sem ele, uma faixa do álbum (o vídeo mais visto); versões ao vivo, covers e remixes ficam de fora. Depois vêm, em música clássica, outra gravação da obra (`obra`) e, por fim, outro vídeo do artista (`artista`), com o rótulo dizendo isso. Sempre o vídeo direto, nunca a página de busca (pedido do usuário em 05/11/2026; a busca fica só no botão "Pesquisar Artista", que o site monta a partir de `artista` em `js/componentes/card-album.js`); `null` quando não há nada. O site mostra o botão tracejado "Não oficial" só quando não há link oficial.
- `discogs`: link do registro mestre do álbum no Discogs (`discogs.com/master/…`; sem mestre, o de uma edição), das ligações do release-group no MusicBrainz (`node scripts/buscar-discogs.js`). A caixa do álbum mostra o botão "Discogs" logo depois de "Ouça o álbum". `null` quando o MusicBrainz não tem o link.
- Notas do RYM: coletadas pelo Claude in Chrome (sessão do usuário, ritmo humano) em `data/albuns/notas-rym.json` (`id`, `url`, `media`, `votos`) e gravadas por `node scripts/aplicar-notas-rym.js data/albuns/notas-rym.json` como `"fonte": "Rate Your Music (usuários)"`.
- `sobreFonte.tipo: "dados"`: descrição curta montada só com os dados da ficha, para álbuns sem artigo em nenhuma Wikipédia (`node scripts/descrever-albuns.js`); o site credita "Descrição montada com os dados do MusicBrainz" — ou do Discogs (`sobreFonte.nome: "Discogs"`, url do Discogs) para fichas fora do MusicBrainz completadas por lá. `--refazer` remonta as descrições depois que a ficha ganha dados.
- `sobreVerificado`: data da busca por `node scripts/buscar-sobre-albuns.js` (`--refazer id` busca de novo).
- Ainda falta: `tags` de clima/mood. A Pesquisa indexa `titulo`, `artista`, `faixas`, `generos`, `tags` e `lancamento`.
