import type Database from 'better-sqlite3';
import type { D1DatabaseLike } from './d1-wallet-store.js';

/**
 * Adapts a better-sqlite3 database to the D1 `prepare().bind().first/all/run`
 * surface so the exact same durable store implementation (D1WalletStore) runs
 * locally (long-polling bot) and on Cloudflare (D1 binding) with one code path.
 */
export function createSqliteD1Adapter(db: Database.Database): D1DatabaseLike {
  return {
    prepare(query: string) {
      return {
        bind(...values: unknown[]) {
          const params = values.map((value) => (value === undefined ? null : value));
          return {
            async first<T>(): Promise<T | null> {
              const stmt = db.prepare(query);
              return (stmt.get(...params) as T | undefined) ?? null;
            },
            async all<T>(): Promise<{ results?: T[] }> {
              const stmt = db.prepare(query);
              return { results: stmt.all(...params) as T[] };
            },
            async run(): Promise<unknown> {
              const stmt = db.prepare(query);
              return stmt.run(...params);
            }
          };
        }
      };
    }
  };
}
