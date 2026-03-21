import type { MigrationConfig } from "drizzle-orm/migrator"
import dotenv from "dotenv"

dotenv.config()

function envOrThrow(key: string): string {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }

  return value
}

// API config
export type APIConfig = {
  port: number
  platform: string
}

export const apiConfig: APIConfig = {
  port: Number(process.env.PORT) || 3000,
  platform: "dev",
}

// Migration config
export const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
}

// DB config
export type DBConfig = {
  url: string
  migrationConfig: MigrationConfig
}

export const dbConfig: DBConfig = {
  url: envOrThrow("DATABASE_URL"),
  migrationConfig,
}