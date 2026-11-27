'use client'

import { ArrowRightIcon, EyeIcon, EyeOffIcon, LoaderCircleIcon } from 'lucide-react'
import { useActionState, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

import { login } from '../actions'

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {})

  const [visible, setVisible] = useState(false)

  const invalid = Boolean(state.error)

  const SubmitIcon = pending ? LoaderCircleIcon : ArrowRightIcon

  return (
    <form action={action} className="border-t border-line-strong pt-8">
      <FieldGroup>
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="voce@email.com"
            defaultValue={state.email}
            aria-invalid={invalid}
            required
          />
        </Field>

        <Field data-invalid={invalid}>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="password"
              name="password"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              maxLength={72}
              aria-invalid={invalid}
              required
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setVisible((value) => !value)}
              >
                {visible ? <EyeOffIcon /> : <EyeIcon />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {state.error && <FieldError>{state.error}</FieldError>}
        </Field>

        <Button type="submit" size="lg" disabled={pending} className="mt-3 justify-between px-4">
          {pending ? 'Entrando...' : 'Entrar no painel'}
          <SubmitIcon className={pending ? 'animate-spin' : undefined} data-icon="inline-end" />
        </Button>
      </FieldGroup>
    </form>
  )
}
