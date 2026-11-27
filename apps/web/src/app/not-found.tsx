import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { NotFoundAnimation } from './_components/not-found-animation'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="aspect-square w-full max-w-xs" aria-hidden="true">
        <NotFoundAnimation />
      </div>
      <h1 className="mt-4 mb-2 text-2xl font-semibold">Página não encontrada</h1>
      <p className="mb-8 text-center text-muted-foreground">
        Esse endereço não existe ou o artigo saiu do ar.
      </p>
      <Link href="/" className={buttonVariants({ size: 'lg' })}>
        <ArrowLeftIcon />
        Voltar para o início
      </Link>
    </main>
  )
}
