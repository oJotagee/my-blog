# Blog API

API REST do blog: login único do dono, posts em seções e blocos, tags, imagens, configuração da home e analytics.

Fastify 5, Zod (`fastify-type-provider-zod`), Drizzle ORM sobre Neon (`neon-http`) e Swagger com Scalar. A estrutura segue a do projeto Lynko.

## Rodando

Na raiz do monorepo, depois do `bun install`:

```bash
cp api/.env.example api/.env
```

```bash
bun run db:migrate
```

```bash
bun run dev:api
```

A API sobe em http://localhost:8080 e a documentação interativa (Scalar) fica em http://localhost:8080/docs.

## Variáveis de ambiente

Validadas em [`src/config/env.ts`](src/config/env.ts); a API não sobe com valor inválido. Use `process.env` só nesse arquivo.

| Variável                        | Obrigatória | Uso                                                                  |
| ------------------------------- | ----------- | -------------------------------------------------------------------- |
| `DATABASE_URL`                  | sim         | conexão Postgres (Neon)                                              |
| `JWT_SECRET`                    | sim         | segredo do access token, mínimo de 32 caracteres                     |
| `ADMIN_EMAIL`                   | sim         | e-mail do único usuário                                              |
| `ADMIN_PASSWORD_HASH`           | sim         | hash bcrypt da senha, gerado por `bun run hash-password`             |
| `JWT_EXPIRES_IN`                | não (15m)   | validade do access token                                             |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | não (30)    | validade do refresh token                                            |
| `CORS_ORIGIN`                   | não         | origens do front, separadas por vírgula                              |
| `PORT`                          | não (8080)  | porta HTTP                                                           |
| `NODE_ENV`                      | não         | `development`, `test` ou `production`                                |
| `AWS_REGION`, `S3_BUCKET`       | não         | bucket das imagens; sem eles `/admin/media` responde 503             |
| `CDN_URL`                       | não         | URL pública das imagens (CloudFront); sem ela as imagens vêm sem URL |
| `MEDIA_MAX_BYTES`               | não (5 MB)  | tamanho máximo de uma imagem                                         |

As credenciais da AWS (`AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`) vêm do ambiente.

## Login

Um único usuário, definido por `ADMIN_EMAIL` e `ADMIN_PASSWORD_HASH`.

1. Gere o hash: `bun run hash-password`. O script mostra a linha pronta para o `.env`, com os `$` escapados (o Bun expande `$` no `.env`).
2. Em produção (Railway), use o hash puro, sem as barras.
3. O login devolve um access token (JWT, enviado como `Bearer`) e grava o refresh token em um cookie `httpOnly`. O refresh é rotacionado a cada uso e, se um token antigo for reutilizado, a sessão é revogada.

O front (Next.js) guarda os tokens no servidor, como no Lynko.

## Rotas

Rotas de `/admin` e `/auth/logout` exigem `Authorization: Bearer <token>`.

| Método             | Caminho                      | Faz                                                                  |
| ------------------ | ---------------------------- | -------------------------------------------------------------------- |
| GET                | `/health`                    | responde `{ "status": "ok" }`                                        |
| POST               | `/auth/login`                | login (5 por minuto)                                                 |
| POST               | `/auth/refresh`              | troca o refresh token por um access token novo                       |
| POST               | `/auth/logout`               | revoga a sessão                                                      |
| GET                | `/posts`                     | posts publicados, com `page`, `limit` (até 50), `q` e `tag`          |
| GET                | `/posts/:slug`               | post publicado com seções, blocos, referências, capa e posição       |
| GET                | `/tags`                      | tags com posts publicados e a contagem                               |
| GET                | `/site`                      | textos da home, rodapé e post em destaque                            |
| POST               | `/analytics/views/:slug`     | conta uma visita (30 por minuto por IP)                              |
| GET                | `/analytics/popular`         | posts mais vistos                                                    |
| GET                | `/admin/posts`               | todos os posts, com filtro `status`                                  |
| POST               | `/admin/posts`               | cria um rascunho; o slug sai do título                               |
| GET, PATCH, DELETE | `/admin/posts/:id`           | lê, edita (`null` limpa um campo) ou apaga um post                   |
| PUT                | `/admin/posts/:id/content`   | substitui seções, blocos e referências; recalcula o tempo de leitura |
| PUT                | `/admin/posts/:id/tags`      | define as tags do post                                               |
| POST               | `/admin/posts/:id/publish`   | publica (precisa de pelo menos um bloco)                             |
| POST               | `/admin/posts/:id/unpublish` | volta para rascunho                                                  |
| GET, POST          | `/admin/tags`                | lista e cria tags                                                    |
| PATCH, DELETE      | `/admin/tags/:id`            | renomeia e apaga uma tag                                             |
| GET                | `/admin/skills`              | tags estudadas, com contagem e datas, para LinkedIn e currículo      |
| GET, PUT           | `/admin/site`                | lê e substitui a configuração da home                                |
| POST               | `/admin/media/presign`       | cria a URL de upload direto ao S3                                    |
| POST               | `/admin/media/:id/confirm`   | valida o arquivo enviado e o publica                                 |
| GET, DELETE        | `/admin/media/:id`           | lê ou apaga uma imagem (409 se algum post a usa)                     |
| GET                | `/admin/dashboard`           | totais, visitas dos últimos 30 dias e posts mais vistos              |

### Conteúdo de um post

`PUT /admin/posts/:id/content` recebe `sections` e `references`. Cada seção tem `label`, `title` e `blocks`. Tipos de bloco: `text`, `image`, `code`, `callout` e `cards`. Blocos com o mesmo `groupId` na mesma seção ficam lado a lado.

### Upload de imagem

1. `POST /admin/media/presign` com `contentType`, `size` e, se quiser, `width`, `height` e `alt`.
2. `PUT` do arquivo na `uploadUrl` devolvida, com o mesmo `Content-Type`.
3. `POST /admin/media/:id/confirm`. A API confere o tamanho e os bytes iniciais e devolve a `url` da CDN.
4. Use o `id` como `mediaId` de um bloco de imagem ou como `coverMediaId` do post.

O bucket precisa de CORS liberando `PUT` a partir do domínio do front.

## Banco de dados

O schema fica em [`src/db/schema.ts`](src/db/schema.ts), com as tabelas nomeadas `xSchema` e `...timestamps`:

| Tabela             | Guarda                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| `sessions`         | sessões de login e o hash do refresh token                             |
| `posts`            | slug, título, resumo, status, período estudado, capa, tempo de leitura |
| `sections`         | seções de um post, com rótulo, título e posição                        |
| `blocks`           | blocos de uma seção; blocos com o mesmo `group_id` ficam lado a lado   |
| `post_references`  | referências usadas no post                                             |
| `media`            | imagens enviadas ao S3, com status `pending`, `ready` ou `failed`      |
| `tags`             | tags de conhecimento (nome e slug únicos)                              |
| `post_tags`        | ligação entre posts e tags                                             |
| `post_views_daily` | visitas por post e por dia                                             |
| `site_settings`    | uma linha com a configuração da home, em JSON                          |

Depois de mudar o schema, gere e aplique uma migration nova. Uma migration já aplicada não é reescrita. O `db:generate` faz perguntas (renomear ou criar coluna), então rode em um terminal interativo.

```bash
bun run db:generate
```

```bash
bun run db:migrate
```

## Estrutura

Cada domínio fica em `src/modules/<dominio>/`, com dependência em uma direção:

| Arquivo                   | Responsabilidade                  |
| ------------------------- | --------------------------------- |
| `<dominio>.routes.ts`     | rota, schema e chamada ao service |
| `<dominio>.service.ts`    | regras de negócio                 |
| `<dominio>.repository.ts` | consultas Drizzle                 |
| `<dominio>.dto.ts`        | schemas Zod de entrada e saída    |

Módulos: `auth`, `health`, `tags`, `posts`, `site`, `media` e `analytics`. O código compartilhado fica em `src/shared`, os plugins em `src/plugins` e a configuração em `src/config`. Os módulos são registrados em `src/app.ts`.

## Deploy (Railway)

- `NODE_ENV=production`, `CORS_ORIGIN` com o domínio do front e `ADMIN_PASSWORD_HASH` sem escape.
- Em produção a API confia no primeiro proxy para ler o IP do cliente (limites por IP). Confira o `X-Forwarded-For` depois do primeiro deploy.

## Testes

```bash
bun run test
```

Testes unitários em `tests/unit`, com repositórios em memória (`tests/unit/support`) e requisições via `app.inject`. O `tests/support/env.ts` define as variáveis de ambiente falsas usadas nos testes.
