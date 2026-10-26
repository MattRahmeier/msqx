# Referências e fontes de dados

| Site | Uso no projeto |
|---|---|
| [Musicmap](https://musicmap.info/) | Genealogia de gêneros: base para a árvore da Visão de Cérebro |
| [RateYourMusic](https://rateyourmusic.com/) | Descritores/tags (mood, vibe), notas, reviews e hierarquia de gêneros |
| [Essential Charts — /mu/ wiki](https://4chanmusic.miraheze.org/wiki/Essential_Charts) | Conteúdo da área "Recomendados pela Internet" |
| [Discogs](https://www.discogs.com/) | Metadados de lançamentos (data, duração, faixas, capas) |
| [Qobuz Discover](https://www.qobuz.com/br-pt/discover) | Referência visual e links de streaming |
| Wikipédia | Resumo de gêneros e álbuns |
| Encyclopaedia Metallum | Gêneros e álbuns de metal |

## Pendências de acesso

- **RateYourMusic** usa proteção anti-bot do Cloudflare. Decisão: ler pelo **Claude in Chrome** com a sessão do usuário, página a página, em ritmo humano. Verificações/CAPTCHA o usuário resolve.
- Discogs tem API oficial (requer token do usuário).
- Streaming: modelo híbrido — links diretos coletados quando possível (Spotify exige chave de API para buscar por script); senão, link de busca.
- Capas: Cover Art Archive (MusicBrainz, sem chave) como primeira opção; Discogs como alternativa.
