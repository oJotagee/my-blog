# Blog API

API REST do blog. Hoje tem a base, a rota `/health` e a documentação. Os módulos de auth, posts, tags, mídia e analytics ainda serão feitos.

Fastify 5, Zod (`fastify-type-provider-zod`), Drizzle ORM sobre Neon (`neon-http`) e Swagger com Scalar.

## Rodando

Na raiz do monorepo, depois do `bun install`:

```bash
cp api/.env.example api/.env
```

```bash
bun run dev:api
```

A API sobe em http://localhost:8080 e a documentação interativa (Scalar) fica em http://localhost:8080/docs.

## Variáveis de ambiente

Validadas em [`src/config/env.ts`](src/config/env.ts); a API não sobe com valor inválido. Use `process.env` só nesse arquivo.

| Variável       | Obrigatória | Uso                                   |
| -------------- | ----------- | ------------------------------------- |
| `DATABASE_URL` | sim         | conexão Postgres (Neon)               |
| `PORT`         | não (8080)  | porta HTTP                            |
| `NODE_ENV`     | não         | `development`, `test` ou `production` |

## Rotas

| Método | Caminho   | Faz                           |
| ------ | --------- | ----------------------------- |
| GET    | `/health` | responde `{ "status": "ok" }` |
| GET    | `/docs`   | documentação do Scalar        |

## Banco de dados

O schema fica em [`src/db/schema.ts`](src/db/schema.ts), com as tabelas nomeadas `xSchema` e `...timestamps`:

| Tabela             | Guarda                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------- |
| `posts`            | slug, título, resumo, status (rascunho ou publicado), data de estudo, capa              |
| `sections`         | seções de um post, com título opcional e posição                                        |
| `blocks`           | blocos de texto ou imagem de uma seção; blocos com o mesmo `group_id` ficam lado a lado |
| `media`            | imagens enviadas ao S3, com status `pending`, `ready` ou `failed`                       |
| `tags`             | tags de conhecimento (nome e slug únicos)                                               |
| `post_tags`        | ligação entre posts e tags                                                              |
| `post_views_daily` | visitas por post e por dia                                                              |
| `site_settings`    | uma linha com a configuração da tela inicial, em JSON                                   |

Depois de mudar o schema, gere e aplique uma migration nova. Uma migration já aplicada não é reescrita.

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

O código compartilhado fica em `src/shared`, os plugins em `src/plugins` e a configuração em `src/config`. Os módulos são registrados em `src/app.ts`.

## Testes

```bash
bun run test
```

Testes unitários em `tests/unit`. O `tests/support/env.ts` define as variáveis de ambiente falsas usadas nos testes.
