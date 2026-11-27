import { NextResponse } from 'next/server'

import { auth } from './lib/auth'

// Passar por aqui também renova o token e grava o cookie novo no navegador.
export const proxy = auth((request) => {
  const isLogin = request.nextUrl.pathname === '/entrar'

  if (!isLogin && !request.auth?.user) {
    return NextResponse.redirect(new URL('/entrar', request.url))
  }

  if (isLogin && request.auth?.user) {
    return NextResponse.redirect(new URL('/painel', request.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/painel/:path*', '/entrar'],
}
