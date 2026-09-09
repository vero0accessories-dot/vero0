import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

export interface DbHealthResult {
  status: "healthy" | "unhealthy" | "disconnected";
  latencyMs?: number;
  database?: string;
  error?: string;
}

let pool: pg.Pool | null = null;
let isInitialized = false;

/**
 * Resolves the PostgreSQL connection configuration from environment variables.
 */
export function getPostgresConfig(): {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
} {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_URL ||
    "";

  if (connectionString && connectionString.trim().startsWith("postgres")) {
    const isLocal =
      connectionString.includes("@localhost") ||
      connectionString.includes("@127.0.0.1") ||
      connectionString.includes("@postgres:") ||
      connectionString.includes("sslmode=disable");

    return {
      connectionString: connectionString.trim(),
      ssl: isLocal ? false : { rejectUnauthorized: false },
    };
  }

  const host = process.env.POSTGRES_HOST || process.env.DB_HOST;
  const user = process.env.POSTGRES_USER || process.env.DB_USER;
  const password = process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD;
  const database = process.env.POSTGRES_DB || process.env.DB_NAME;
  const port = parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || "5432", 10);

  if (host && user && database) {
    const isInternal = host === "postgres" || host === "localhost" || host === "127.0.0.1";
    return {
      host,
      port,
      database,
      user,
      password,
      ssl: isInternal ? false : { rejectUnauthorized: false },
    };
  }

  return {};
}

/**
 * Checks whether PostgreSQL configuration is provided.
 */
export function isPostgresConfigured(): boolean {
  const config = getPostgresConfig();
  return !!(config.connectionString || (config.host && config.database && config.user));
}

/**
 * Returns the singleton PostgreSQL connection pool with connection pooling & lifecycle hooks.
 */
export function getPostgresPool(): pg.Pool | null {
  if (!isPostgresConfigured()) {
    return null;
  }

  if (!pool) {
    const config = getPostgresConfig();
    pool = new Pool({
      ...config,
      max: parseInt(process.env.DB_POOL_MAX || "20", 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || "5000", 10),
    });

    pool.on("error", (err) => {
      console.error("[PostgreSQL Pool Error]: Unexpected idle client error:", err.message);
    });

    console.log("[PostgreSQL] Connection pool initialized successfully.");
  }

  return pool;
}

/**
 * Gracefully shuts down the PostgreSQL connection pool.
 */
export async function closePostgresPool(): Promise<void> {
  if (pool) {
    console.log("[PostgreSQL] Closing connection pool...");
    await pool.end();
    pool = null;
    isInitialized = false;
    console.log("[PostgreSQL] Connection pool closed.");
  }
}

/**
 * Verifies database health with an active query and latency measurement.
 */
export async function checkPostgresHealth(): Promise<DbHealthResult> {
  const p = getPostgresPool();
  if (!p) {
    return { status: "disconnected", error: "DATABASE_URL not configured" };
  }

  const start = Date.now();
  try {
    const res = await p.query("SELECT current_database() as db, NOW() as current_time");
    const latencyMs = Date.now() - start;
    return {
      status: "healthy",
      latencyMs,
      database: res.rows[0]?.db || "vero",
    };
  } catch (err: any) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      error: err.message || "Failed to query database",
    };
  }
}

/**
 * Helper to safely format SQL column names or values.
 */
function escapeIdentifier(id: string): string {
  return `"${id.replace(/"/g, '""')}"`;
}

/**
 * Production-ready SQL Query Builder interface that mimics Supabase's chained API
 * but executes native, parameterized PostgreSQL queries through the connection pool.
 */
export class PostgresQueryBuilder {
  private table: string;
  private pool: pg.Pool;
  private action: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private selectCols: string = "*";
  private whereClauses: { col: string; op: string; val: any }[] = [];
  private orderClauses: { col: string; ascending: boolean }[] = [];
  private limitCount?: number;
  private insertRows: any[] = [];
  private updateValues: Record<string, any> = {};
  private onConflictCols: string[] = ["id"];
  private expectSingle: boolean = false;
  private returnMaybeSingle: boolean = false;

  constructor(table: string, pool: pg.Pool) {
    this.table = table;
    this.pool = pool;
  }

  select(cols: string = "*"): this {
    this.action = "select";
    this.selectCols = cols;
    return this;
  }

  insert(rows: any | any[]): this {
    this.action = "insert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  upsert(rows: any | any[], options?: { onConflict?: string }): this {
    this.action = "upsert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    if (options?.onConflict) {
      this.onConflictCols = options.onConflict.split(",").map((c) => c.trim());
    }
    return this;
  }

  update(values: Record<string, any>): this {
    this.action = "update";
    this.updateValues = values;
    return this;
  }

  delete(): this {
    this.action = "delete";
    return this;
  }

  eq(col: string, val: any): this {
    this.whereClauses.push({ col, op: "=", val });
    return this;
  }

  neq(col: string, val: any): this {
    this.whereClauses.push({ col, op: "!=", val });
    return this;
  }

  in(col: string, vals: any[]): this {
    this.whereClauses.push({ col, op: "= ANY", val: vals });
    return this;
  }

  order(col: string, options: { ascending?: boolean } = { ascending: true }): this {
    this.orderClauses.push({ col, ascending: options.ascending !== false });
    return this;
  }

  limit(n: number): this {
    this.limitCount = n;
    return this;
  }

  maybeSingle(): Promise<{ data: any; error: any }> {
    this.returnMaybeSingle = true;
    this.limitCount = 1;
    return this.execute();
  }

  single(): Promise<{ data: any; error: any }> {
    this.expectSingle = true;
    this.limitCount = 1;
    return this.execute();
  }

  then(onfulfilled?: (value: { data: any; error: any }) => any, onrejected?: (reason: any) => any): Promise<any> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: any; error: any }> {
    try {
      const sqlParts: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      const buildWhere = (): string => {
        if (this.whereClauses.length === 0) return "";
        const parts = this.whereClauses.map((w) => {
          const colId = escapeIdentifier(w.col);
          const p = `$${paramIdx++}`;
          params.push(w.val);
          if (w.op === "= ANY") {
            return `${colId} = ANY(${p})`;
          }
          return `${colId} ${w.op} ${p}`;
        });
        return ` WHERE ${parts.join(" AND ")}`;
      };

      if (this.action === "select") {
        let cols = this.selectCols;
        if (cols === "*") {
          cols = "*";
        } else {
          cols = cols
            .split(",")
            .map((c) => {
              const trimmed = c.trim();
              if (trimmed === "*") return "*";
              return escapeIdentifier(trimmed);
            })
            .join(", ");
        }

        sqlParts.push(`SELECT ${cols} FROM public.${escapeIdentifier(this.table)}`);
        sqlParts.push(buildWhere());

        if (this.orderClauses.length > 0) {
          const orderParts = this.orderClauses.map(
            (o) => `${escapeIdentifier(o.col)} ${o.ascending ? "ASC" : "DESC"}`
          );
          sqlParts.push(` ORDER BY ${orderParts.join(", ")}`);
        }

        if (typeof this.limitCount === "number") {
          sqlParts.push(` LIMIT ${this.limitCount}`);
        }
      } else if (this.action === "insert" || this.action === "upsert") {
        if (this.insertRows.length === 0) {
          return { data: [], error: null };
        }

        const keys = Array.from(
          new Set(this.insertRows.flatMap((r) => Object.keys(r)))
        ).filter((k) => k !== undefined && k !== "");

        const colNames = keys.map(escapeIdentifier).join(", ");
        const valueTuples: string[] = [];

        for (const row of this.insertRows) {
          const rowParams: string[] = [];
          for (const key of keys) {
            let val = row[key];
            // Format object/array values as JSON string if not undefined
            if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
              val = JSON.stringify(val);
            } else if (Array.isArray(val)) {
              // Convert object arrays to JSON string or string array
              const hasObjects = val.some((v) => typeof v === "object" && v !== null);
              if (hasObjects) {
                val = JSON.stringify(val);
              }
            }
            params.push(val === undefined ? null : val);
            rowParams.push(`$${paramIdx++}`);
          }
          valueTuples.push(`(${rowParams.join(", ")})`);
        }

        sqlParts.push(
          `INSERT INTO public.${escapeIdentifier(this.table)} (${colNames}) VALUES ${valueTuples.join(", ")}`
        );

        if (this.action === "upsert") {
          const conflictTarget = this.onConflictCols.map(escapeIdentifier).join(", ");
          const updateAssigns = keys
            .filter((k) => !this.onConflictCols.includes(k))
            .map((k) => `${escapeIdentifier(k)} = EXCLUDED.${escapeIdentifier(k)}`)
            .join(", ");

          if (updateAssigns.length > 0) {
            sqlParts.push(` ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateAssigns}`);
          } else {
            sqlParts.push(` ON CONFLICT (${conflictTarget}) DO NOTHING`);
          }
        }

        sqlParts.push(" RETURNING *");
      } else if (this.action === "update") {
        const updateKeys = Object.keys(this.updateValues).filter((k) => k !== undefined);
        if (updateKeys.length === 0) {
          return { data: [], error: null };
        }

        const assigns: string[] = [];
        for (const key of updateKeys) {
          let val = this.updateValues[key];
          if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
            val = JSON.stringify(val);
          } else if (Array.isArray(val)) {
            const hasObjects = val.some((v) => typeof v === "object" && v !== null);
            if (hasObjects) val = JSON.stringify(val);
          }
          params.push(val === undefined ? null : val);
          assigns.push(`${escapeIdentifier(key)} = $${paramIdx++}`);
        }

        sqlParts.push(`UPDATE public.${escapeIdentifier(this.table)} SET ${assigns.join(", ")}`);
        sqlParts.push(buildWhere());
        sqlParts.push(" RETURNING *");
      } else if (this.action === "delete") {
        sqlParts.push(`DELETE FROM public.${escapeIdentifier(this.table)}`);
        sqlParts.push(buildWhere());
        sqlParts.push(" RETURNING *");
      }

      const sql = sqlParts.join("");
      const result = await this.pool.query(sql, params);
      const rows = result.rows;

      if (this.expectSingle) {
        if (rows.length === 0) {
          return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
        }
        return { data: rows[0], error: null };
      }

      if (this.returnMaybeSingle) {
        return { data: rows.length > 0 ? rows[0] : null, error: null };
      }

      return { data: rows, error: null };
    } catch (err: any) {
      console.error(`[PostgresQueryBuilder Error] Table: ${this.table} | Error:`, err.message);
      return {
        data: null,
        error: {
          message: err.message,
          code: err.code || "DB_ERROR",
          detail: err.detail,
          hint: err.hint,
        },
      };
    }
  }
}

/**
 * Creates a client that conforms to the database access interface
 * (e.g. client.from("table").select()...)
 */
export function createPostgresClient(poolInstance: pg.Pool) {
  return {
    from(table: string) {
      return new PostgresQueryBuilder(table, poolInstance);
    },
    async query(text: string, params?: any[]) {
      return poolInstance.query(text, params);
    },
  };
}

/**
 * Automatically initializes database schema and seeds default data
 * on application startup if PostgreSQL is connected.
 */
export async function initializePostgresDatabase(): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) return false;
  if (isInitialized) return true;

  try {
    console.log("[PostgreSQL Boot] Verifying database schema & tables...");

    // Check if core table 'users' exists
    const checkRes = await p.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1;`
    );

    if (checkRes.rows.length === 0) {
      console.log("[PostgreSQL Boot] Schema not detected. Applying initial schema migration...");
      const schemaFiles = [
        path.join(process.cwd(), "init-db", "01-init-schema.sql"),
        path.join(process.cwd(), "supabase-full-enterprise-schema.sql"),
      ];

      let schemaApplied = false;
      for (const file of schemaFiles) {
        if (fs.existsSync(file)) {
          const sql = fs.readFileSync(file, "utf-8");
          console.log(`[PostgreSQL Boot] Executing schema file: ${path.basename(file)}...`);
          await p.query(sql);
          schemaApplied = true;
          break;
        }
      }

      if (!schemaApplied) {
        console.warn("[PostgreSQL Boot] No schema file found on disk; skipping initial DDL execution.");
      }
    }

    // Ensure shipping_rates table exists
    const checkShipping = await p.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shipping_rates' LIMIT 1;`
    );
    if (checkShipping.rows.length === 0) {
      const shippingFile = path.join(process.cwd(), "supabase_shipping_migration.sql");
      if (fs.existsSync(shippingFile)) {
        console.log("[PostgreSQL Boot] Applying shipping_rates table migration...");
        const shippingSql = fs.readFileSync(shippingFile, "utf-8");
        await p.query(shippingSql);
      }
    }

    // Ensure salt column exists on users table for secure password hashing
    await p.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='salt') THEN
          ALTER TABLE public.users ADD COLUMN salt TEXT;
        END IF;
      END $$;
    `);

    isInitialized = true;
    console.log("[PostgreSQL Boot] Database verification completed successfully.");
    return true;
  } catch (err: any) {
    console.error("[PostgreSQL Boot Error] Failed to initialize database:", err.message);
    return false;
  }
}
