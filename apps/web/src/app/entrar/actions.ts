'use server'

import { AuthError, CredentialsSignin } from 'next-auth'

import { signIn } from '@/lib/auth'

export type LoginState = { error?: string; email?: string }

const MESSAGES: Record<string, string> = {
  credentials: 'E-mail ou senha incorretos.',
  too_many_attempts: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
  unavailable: 'Não foi possível falar com o servidor. Tente de novo em instantes.',
}

export async function login(_state: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '')

  try {
    await signIn('credentials', {
      email,
      password: String(form.get('password') ?? ''),
      redirectTo: '/painel',
    })
  } catch (error) {
    // O redirecionamento do sucesso também chega aqui e precisa seguir adiante.
    if (!(error instanceof AuthError)) throw error

    const code = error instanceof CredentialsSignin ? error.code : 'unavailable'

    return { email, error: MESSAGES[code] ?? MESSAGES.unavailable }
  }

  return {}
}
