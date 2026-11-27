# Blog Web

Front do blog em Next.js 16 (App Router, `src/`), seguindo o padrão do Lynko e do booktattoo.

Tailwind 4, shadcn (Base UI) com `lucide-react`, TanStack Query, axios, zustand, zod, sonner e lottie-react.

## Rodando

Na raiz do monorepo, depois do `bun install`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

```bash
bun run dev:web
```

Abre em http://localhost:3000. A API precisa estar no endereço de `NEXT_PUBLIC_API_URL` (padrão http://localhost:8080).

## Estrutura

| Pasta               | O que tem                                              |
| ------------------- | ------------------------------------------------------ |
| `src/app`           | rotas; `providers.tsx` registra TanStack Query e toast |
| `src/components/ui` | componentes do shadcn                                  |
| `src/lib`           | cliente axios, mensagens de erro, variáveis e `cn`     |
| `public/animation`  | animações Lottie                                       |

## Telas

| Endereço          | O que é                                                       |
| ----------------- | ------------------------------------------------------------- |
| `/`               | home: destaque, arquivo com busca, filtro e paginação, sobre  |
| `/artigos/[slug]` | artigo com Markdown nos blocos de texto e contagem de visita  |
| `/entrar`         | login; nenhum link do blog aponta para cá                     |
| `/painel`         | painel protegido; as telas internas ainda estão em construção |

## Login

`next-auth` com e-mail e senha conferidos pela API. Os tokens ficam em um cookie `httpOnly` cifrado e o navegador não os lê. O `src/proxy.ts` protege `/painel` e renova o token vencido.

Defina `AUTH_SECRET` no `.env.local` (`openssl rand -base64 32`). Em produção, fora da Vercel, defina também `AUTH_TRUST_HOST=true`.

Para adicionar um componente, rode `bunx shadcn@latest add <nome>` dentro de `apps/web`.
