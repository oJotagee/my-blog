process.env.NODE_ENV = 'test'

process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/test'

process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters'

process.env.CORS_ORIGIN = 'http://localhost:3000'

process.env.ADMIN_EMAIL = 'admin@example.com'

process.env.ADMIN_PASSWORD_HASH = await Bun.password.hash('admin-password', {
  algorithm: 'bcrypt',
  cost: 4,
})
