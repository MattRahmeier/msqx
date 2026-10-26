# MusiqueScout — guia para sessões

Site de curadoria musical ("segundo cérebro" de gêneros). Leia antes de trabalhar:

- `docs/especificacao.md` — o que construir (4 áreas + visual). É a fonte de verdade; veio da página "Musique Scout" do Notion.
- `docs/modelo-de-dados.md` — formato dos JSON em `data/`.
- `docs/roadmap.md` — fases e decisões em aberto. Não pule a Fase 0 sem confirmar com o usuário.
- `docs/referencias.md` — fontes de dados e pendências de acesso (RYM/Cloudflare).

Conteúdo:
- Resumos e descrições de gêneros/álbuns são sempre texto escrito por pessoas (Wikipédia ou outra fonte com licença livre, citada), nunca redigidos pelo Claude. Não copiar texto de sites com direitos reservados (RYM, AllMusic etc.); usar só como link.
- Exceção: quando o usuário indica uma fonte sem licença livre (ex.: comentário do Reddit), reescrever os pontos principais com outras palavras, sem acrescentar informação que não está na fonte, e marcar `resumoFonte.tipo: "parafrase"`.

Convenções:
- Textos da interface em português do Brasil; nomes de gêneros sempre os nomes reais (em inglês quando for o nome usual).
- Arquivos e IDs em `kebab-case`.
- Tema escuro: fundo preto-concreto, texto branco, pop-ups off-white. Minimalista, estilo Spotify/Qobuz.
- Ícones sempre que houver escolha de plataforma (Spotify, YouTube, Qobuz).
