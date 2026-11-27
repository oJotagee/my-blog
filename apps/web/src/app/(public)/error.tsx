'use client'

import { RotateCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Não foi possível carregar o blog</EmptyTitle>
          <EmptyDescription>
            O servidor não respondeu. Tente de novo em alguns instantes.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => retry()}>
            <RotateCwIcon data-icon="inline-start" />
            Tentar de novo
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
