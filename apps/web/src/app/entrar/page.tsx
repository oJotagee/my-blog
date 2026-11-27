import type { Metadata } from 'next'
import Link from 'next/link'

import { LoginForm } from './_components/login-form'

export const metadata: Metadata = {
  title: 'Entrar',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="font-mono text-sm font-semibold transition-opacity hover:opacity-70"
        >
          jg<span className="text-faint">/</span>blog
        </Link>
        <p className="font-mono text-[0.6875rem] tracking-widest text-faint uppercase">
          Área restrita
        </p>
      </header>
      <main className="grid flex-1 place-items-center px-5 py-16">
        <div className="w-full max-w-md">
          <p className="mb-5 font-mono text-xs tracking-widest text-faint uppercase">
            Painel administrativo
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">Bem-vindo de volta.</h1>
          <p className="mt-3 mb-10 text-sm leading-relaxed text-muted-foreground">
            Entre com suas credenciais para gerenciar o blog.
          </p>
          <LoginForm />
          <p className="mt-8 text-center font-mono text-[0.625rem] tracking-wider text-faint">
            ACESSO PROTEGIDO · SESSÃO SEGURA
          </p>
        </div>
      </main>
    </>
  )
}
