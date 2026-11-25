import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool, PoolClient } from "pg";
import { pool as defaultPool } from "./index.js";

// Fixed 32-bit advisory lock key ("PAWL" in ASCII) to serialize concurrent startups.
const MIGRATION_ADVISORY_LOCK_ID = 0x5041574c;

const TRANSIENT_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "57P01", // admin_shutdown
  "57P03", // cannot_connect_now (database system is starting up)
]);

export interface MigrationClient {
  query(sql: string, params?: unknown[]): Promise<unknown>;
  release(err?: Error | boolean): void;
}

export interface MigrationPool {
  connect(): Promise<MigrationClient>;
}

export type MigrateExecutor = (
  client: MigrationClient,
  migrationsFolder: string,
) => Promise<void>;

export interface RunMigrationsOptions {
  pool?: MigrationPool;
  migrationsFolder?: string;
  maxAttempts?: number;
  retryDelayMs?: number;
  migrateExecutor?: MigrateExecutor;
  logger?: Pick<Console, "info" | "warn" | "error">;
}

export function resolveMigrationsFolder(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../../drizzle");
}

function isTransientConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }

  const record = err as { code?: unknown; cause?: unknown };
  if (typeof record.code === "string" && TRANSIENT_ERROR_CODES.has(record.code)) {
    return true;
  }

  return record.cause ? isTransientConnectionError(record.cause) : false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function defaultMigrateExecutor(
  client: MigrationClient,
  migrationsFolder: string,
): Promise<void> {
  const migrationDb = drizzle(client as PoolClient);
  await migrate(migrationDb, { migrationsFolder });
}

async function runWithAdvisoryLock(
  pool: MigrationPool,
  migrationsFolder: string,
  migrateExecutor: MigrateExecutor,
): Promise<void> {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_ADVISORY_LOCK_ID]);
    lockAcquired = true;
    await migrateExecutor(client, migrationsFolder);
  } finally {
    if (lockAcquired) {
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_ADVISORY_LOCK_ID]);
      } catch {
        // Ignore unlock errors if the connection was already closed; session end releases the lock.
      }
    }
    client.release();
  }
}

export async function runMigrations(options: RunMigrationsOptions = {}): Promise<void> {
  const pool: MigrationPool = options.pool ?? (defaultPool as Pool);
  const migrationsFolder = options.migrationsFolder ?? resolveMigrationsFolder();
  const maxAttempts = options.maxAttempts ?? 5;
  const retryDelayMs = options.retryDelayMs ?? 1500;
  const migrateExecutor = options.migrateExecutor ?? defaultMigrateExecutor;
  const logger = options.logger ?? console;

  logger.info(`[migrations] Checking and applying migrations from ${migrationsFolder}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await runWithAdvisoryLock(pool, migrationsFolder, migrateExecutor);
      logger.info("[migrations] Database migrations are up to date");
      return;
    } catch (err) {
      const canRetry = attempt < maxAttempts && isTransientConnectionError(err);
      if (!canRetry) {
        logger.error("[migrations] Failed to apply database migrations:", err);
        throw err;
      }

      const waitMs = retryDelayMs * attempt;
      logger.warn(
        `[migrations] Database unavailable (attempt ${attempt}/${maxAttempts}), retrying in ${waitMs}ms...`,
      );
      await sleep(waitMs);
    }
  }
}
