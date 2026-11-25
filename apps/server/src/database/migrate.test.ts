import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  resolveMigrationsFolder,
  runMigrations,
  type MigrationClient,
  type MigrationPool,
} from "./migrate.js";

function createSilentLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("resolveMigrationsFolder", () => {
  it("points to apps/server/drizzle containing drizzle journal", () => {
    const folder = resolveMigrationsFolder();
    expect(folder.endsWith(path.join("apps", "server", "drizzle"))).toBe(true);
    expect(existsSync(path.join(folder, "meta", "_journal.json"))).toBe(true);
  });
});

describe("runMigrations", () => {
  it("acquires advisory lock, runs migrations, and releases lock and client", async () => {
    const calls: string[] = [];
    const client: MigrationClient = {
      query: vi.fn(async (sql: string) => {
        calls.push(sql);
        return { rows: [] };
      }),
      release: vi.fn(() => {
        calls.push("release");
      }),
    };
    const pool: MigrationPool = {
      connect: vi.fn(async () => client),
    };
    const migrateExecutor = vi.fn(async (_c: MigrationClient, folder: string) => {
      calls.push(`migrate:${folder}`);
    });

    await runMigrations({
      pool,
      migrationsFolder: "/tmp/drizzle",
      migrateExecutor,
      logger: createSilentLogger(),
    });

    expect(calls).toEqual([
      "SELECT pg_advisory_lock($1)",
      "migrate:/tmp/drizzle",
      "SELECT pg_advisory_unlock($1)",
      "release",
    ]);
  });

  it("releases advisory lock and client even when migration fails", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const release = vi.fn();
    const pool: MigrationPool = {
      connect: vi.fn(async () => ({ query, release })),
    };
    const nonTransientError = new Error("syntax error in migration");

    await expect(
      runMigrations({
        pool,
        migrationsFolder: "/tmp/drizzle",
        maxAttempts: 3,
        retryDelayMs: 1,
        migrateExecutor: async () => {
          throw nonTransientError;
        },
        logger: createSilentLogger(),
      }),
    ).rejects.toThrow("syntax error in migration");

    expect(query).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("retries transient database connection errors and succeeds once ready", async () => {
    let attempts = 0;
    const query = vi.fn(async () => ({ rows: [] }));
    const release = vi.fn();
    const pool: MigrationPool = {
      connect: vi.fn(async () => {
        attempts += 1;
        if (attempts < 3) {
          const err = new Error("connect ECONNREFUSED") as Error & { code?: string };
          err.code = "ECONNREFUSED";
          throw err;
        }
        return { query, release };
      }),
    };
    const migrateExecutor = vi.fn(async () => {});

    await runMigrations({
      pool,
      migrationsFolder: "/tmp/drizzle",
      maxAttempts: 4,
      retryDelayMs: 1,
      migrateExecutor,
      logger: createSilentLogger(),
    });

    expect(attempts).toBe(3);
    expect(migrateExecutor).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
