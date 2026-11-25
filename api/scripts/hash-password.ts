import { hashPassword } from '../src/shared/password'

const password = prompt('Admin password:')

if (!password) {
  console.error('Password is required')

  process.exit(1)
}

const hash = await hashPassword(password)

console.log('\nFor .env (the $ must be escaped, Bun expands it):')
console.log(`ADMIN_PASSWORD_HASH=${hash.replaceAll('$', '\\$')}`)
console.log('\nFor hosting env vars (raw):')
console.log(hash)
