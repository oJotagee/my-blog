'use client'

import { LoaderCircleIcon, SearchIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import { Kbd } from '@/components/ui/kbd'
import { archiveHref } from '@/lib/archive'

const DEBOUNCE_MS = 350

export function ArchiveSearch({ q, tag }: { q: string; tag: string }) {
  const router = useRouter()

  const input = useRef<HTMLInputElement>(null)

  const sent = useRef(q)

  const [value, setValue] = useState(q)

  const [pending, startTransition] = useTransition()

  // Só sobrescreve o campo quando a URL muda por fora, como em "Limpar filtros".
  useEffect(() => {
    if (q === sent.current) return

    sent.current = q

    setValue(q)
  }, [q])

  useEffect(() => {
    const next = value.trim()

    if (next === sent.current) return

    const timer = setTimeout(() => {
      sent.current = next

      startTransition(() => router.replace(archiveHref({ q: next, tag }), { scroll: false }))
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [value, tag, router])

  useEffect(() => {
    function focusOnSlash(event: KeyboardEvent) {
      const typing =
        event.target instanceof Element &&
        event.target.closest('input, textarea, [contenteditable]')

      if (event.key !== '/' || typing) return

      event.preventDefault()

      input.current?.focus()
    }

    window.addEventListener('keydown', focusOnSlash)

    return () => window.removeEventListener('keydown', focusOnSlash)
  }, [])

  const Icon = pending ? LoaderCircleIcon : SearchIcon

  return (
    <label className="flex items-center gap-3 border-b border-line-strong py-3 transition-colors focus-within:border-foreground">
      <Icon
        aria-hidden="true"
        className={pending ? 'size-4 shrink-0 animate-spin' : 'size-4 shrink-0'}
      />
      <span className="sr-only">Buscar artigos</span>
      <input
        ref={input}
        type="search"
        value={value}
        maxLength={100}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar por assunto..."
        className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
      />
      <Kbd className="hidden sm:inline-flex">/</Kbd>
    </label>
  )
}
