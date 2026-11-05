# Tracklore — guia para sessões

Site de curadoria musical ("segundo cérebro" de gêneros). Leia antes de trabalhar:

- `docs/especificacao.md` — o que construir (4 áreas + visual). É a fonte de verdade; veio da página "Musique Scout" do Notion.
- `docs/modelo-de-dados.md` — formato dos JSON em `data/`.
- `docs/roadmap.md` — fases e decisões em aberto. Não pule a Fase 0 sem confirmar com o usuário.
- `docs/referencias.md` — fontes de dados e pendências de acesso (RYM/Cloudflare).

Conteúdo:
- Resumos e descrições de gêneros/álbuns são sempre texto escrito por pessoas (Wikipédia ou outra fonte com licença livre, citada), nunca redigidos pelo Claude. Não copiar texto de sites com direitos reservados (RYM, AllMusic etc.); usar só como link.
- Textos que só existem em inglês são traduzidos para o português com fidelidade (sem acrescentar nada) e marcados com `traduzido: true` na fonte; o site avisa "Traduzido do inglês" e mostra só o link para o original — o texto em inglês não é guardado (`scripts/aplicar-traducoes.js`).
- Álbum sem artigo em nenhuma Wikipédia: descrição curta montada só com os dados da ficha (coletânea/ao vivo/álbum, artista, ano, gravadora, faixas), com `sobreFonte.tipo: "dados"` (`scripts/descrever-albuns.js`) — decisão do usuário.
- Notas da crítica podem vir de outros sites (Pitchfork, Discogs…) — só a nota e o link, nunca o texto. Sites que bloqueiam acesso automatizado (Cloudflare) não são contornados.
- Notas sobre pronúncia não entram nos textos, nem ao traduzir (`scripts/limpar-pronuncia.js`).
- Exceção: quando o usuário indica uma fonte sem licença livre (ex.: comentário do Reddit), reescrever os pontos principais com outras palavras, sem acrescentar informação que não está na fonte, e marcar `resumoFonte.tipo: "parafrase"`.

Convenções:
- Textos da interface em português do Brasil; nomes de gêneros sempre os nomes reais (em inglês quando for o nome usual).
- Arquivos e IDs em `kebab-case`.
- Tema escuro: fundo preto-concreto, texto branco, pop-ups off-white. Minimalista, estilo Spotify/Qobuz.
- Ícones sempre que houver escolha de plataforma (Spotify, YouTube, Qobuz).
- Disco sem link nos streamings comuns recebe sempre um link não oficial do YouTube (`naoOficial`, `scripts/buscar-nao-oficiais.js`): o álbum, uma faixa dele ou o que houver do artista. Sempre o vídeo direto, nunca a página de busca.
- Links para fora do site (serviços de streaming, YouTube, Discogs, Wikipédia…) sempre abrem em outra aba: `target="_blank" rel="noopener"` no HTML, e `js/app.js` garante isso para qualquer link externo. Não usar links `intent:` para forçar a abertura de apps no Android: em navegadores como o Brave eles dão página de erro.
