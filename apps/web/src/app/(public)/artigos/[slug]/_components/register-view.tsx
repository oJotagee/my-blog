'use client'

import { useEffect, useRef } from 'react'

import { api } from '@/lib/api'

/** Conta a visita a partir do navegador, para o limite por IP valer por visitante. */
export function RegisterView({ slug }: { slug: string }) {
  const sent = useRef('')

  useEffect(() => {
    // O modo estrito do React roda o efeito duas vezes em desenvolvimento.
    if (sent.current === slug) return

    sent.current = slug

    // Perder uma contagem não pode atrapalhar a leitura.
    api.post(`/analytics/views/${slug}`).catch(() => {})
  }, [slug])

  return null
}
