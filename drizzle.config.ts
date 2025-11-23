import type { Config } from 'drizzle-kit'

export default {
  schema: './src/main/database/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './fieldworks.db'
  }
} satisfies Config
