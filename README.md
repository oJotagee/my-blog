# Blog

Blog pessoal para me forçar a estudar. Cada coisa que eu estudo ou leio vira um artigo ou post, e o que aprendi vira material para o LinkedIn e o currículo.

## Objetivo

- Publicar artigos e posts sobre o que estudei ou li, com texto e imagens em blocos (por exemplo, texto, imagem, texto, imagem, ou imagem e texto lado a lado), separados em seções.
- Organizar o conhecimento por tags (CRUD), com a data em que estudei cada assunto, para listar o que levar ao LinkedIn e ao currículo.
- Ter um painel só meu, com login único: posts publicados, analytics de visitas e um dashboard geral.
- Customizar a tela inicial do blog (pendente, depende do design do front).

## Estado atual

| Parte                | Situação                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| API: base            | pronta: Fastify, Zod, Swagger com Scalar, rota `/health`                                              |
| API: schema do banco | pronto em `api/src/db/schema.ts`: posts, seções, blocos, mídia, tags, visitas por dia e configurações |
| API: módulos         | a fazer: auth, posts, tags, mídia, analytics                                                          |
| Front                | a fazer: depende do design                                                                            |

## Estrutura

Monorepo com [Bun](https://bun.com) workspaces:

| Pasta                   | O que é                                        |
| ----------------------- | ---------------------------------------------- |
| [`api/`](api/README.md) | API REST em Fastify, Drizzle e Postgres (Neon) |
| `apps/*`                | reservado para o front, ainda não existe       |

## Requisitos

- Bun 1.4.2 ou mais novo
- Um banco Postgres no [Neon](https://neon.com)
- Para o upload de imagens (módulo de mídia, ainda não feito): bucket S3 e distribuição CloudFront

## Como rodar

1. Instale as dependências na raiz:

   ```bash
   bun install
   ```

2. Crie o arquivo de ambiente e preencha a `DATABASE_URL`:

   ```bash
   cp api/.env.example api/.env
   ```

3. Gere e aplique as migrations:

   ```bash
   bun run db:generate
   ```

   ```bash
   bun run db:migrate
   ```

4. Suba a API (porta 8080):

   ```bash
   bun run dev:api
   ```

Abra http://localhost:8080/docs para ver a documentação.

## Scripts da raiz

| Comando               | Faz                                                 |
| --------------------- | --------------------------------------------------- |
| `bun run dev`         | sobe todos os workspaces em modo de desenvolvimento |
| `bun run dev:api`     | sobe só a API                                       |
| `bun run lint`        | verifica lint e formatação com o Biome              |
| `bun run lint:fix`    | corrige lint e formatação                           |
| `bun run format`      | formata o código                                    |
| `bun run typecheck`   | checa os tipos de todos os workspaces               |
| `bun run test`        | roda os testes unitários                            |
| `bun run db:generate` | gera uma migration a partir do schema               |
| `bun run db:migrate`  | aplica as migrations                                |
| `bun run db:studio`   | abre o Drizzle Studio                               |

## Qualidade

- **Pre-commit** (`.githooks/pre-commit`): formata e corrige os arquivos no stage com o Biome e recoloca no stage. Bloqueia o commit se sobrar erro. É instalado sozinho pelo `bun install`.
- **CI** (`.github/workflows/ci.yml`): em push na `main` e em PR, roda lint e formatação, typecheck e testes unitários da API.

## Estilo

Biome na raiz: 2 espaços, aspas simples, sem ponto e vírgula. Sem comentários no código e com uma linha em branco entre statements.
