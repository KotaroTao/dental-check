// PostgreSQL direct client (replaces Prisma due to network restrictions)
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma-like interface for compatibility
interface WhereClause {
  id?: string;
  email?: string;
  clinicId?: string;
  slug?: string;
  code?: string;
}

interface CreateData {
  [key: string]: unknown;
}

interface UpdateData {
  [key: string]: unknown;
}

function buildWhereClause(where: WhereClause): { text: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (where.id) {
    conditions.push(`id = $${paramIndex++}`);
    values.push(where.id);
  }
  if (where.email) {
    conditions.push(`email = $${paramIndex++}`);
    values.push(where.email);
  }
  if (where.clinicId) {
    conditions.push(`clinic_id = $${paramIndex++}`);
    values.push(where.clinicId);
  }
  if (where.slug) {
    conditions.push(`slug = $${paramIndex++}`);
    values.push(where.slug);
  }
  if (where.code) {
    conditions.push(`code = $${paramIndex++}`);
    values.push(where.code);
  }

  return {
    text: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function transformRow(row: Record<string, unknown>): Record<string, unknown> {
  if (!row) return row;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
}

function createModel(tableName: string) {
  return {
    findUnique: async (args: { where: WhereClause; include?: Record<string, boolean> }) => {
      const { text, values } = buildWhereClause(args.where);
      const query = `SELECT * FROM ${tableName} ${text} LIMIT 1`;
      const result = await pool.query(query, values);
      const row = result.rows[0] ? transformRow(result.rows[0]) : null;

      // Handle includes for subscription
      if (row && args.include?.subscription && tableName === "clinics") {
        const subResult = await pool.query(
          "SELECT * FROM subscriptions WHERE clinic_id = $1",
          [row.id]
        );
        row.subscription = subResult.rows[0] ? transformRow(subResult.rows[0]) : null;
      }

      return row;
    },

    findFirst: async (args: { where: WhereClause }) => {
      const { text, values } = buildWhereClause(args.where);
      const query = `SELECT * FROM ${tableName} ${text} LIMIT 1`;
      const result = await pool.query(query, values);
      return result.rows[0] ? transformRow(result.rows[0]) : null;
    },

    findMany: async (args?: { where?: WhereClause; orderBy?: Record<string, string> }) => {
      let query = `SELECT * FROM ${tableName}`;
      const values: unknown[] = [];

      if (args?.where) {
        const whereClause = buildWhereClause(args.where);
        query += ` ${whereClause.text}`;
        values.push(...whereClause.values);
      }

      if (args?.orderBy) {
        const orderFields = Object.entries(args.orderBy).map(
          ([key, dir]) => `${camelToSnake(key)} ${dir.toUpperCase()}`
        );
        query += ` ORDER BY ${orderFields.join(", ")}`;
      }

      const result = await pool.query(query, values);
      return result.rows.map(transformRow);
    },

    create: async (args: { data: CreateData }) => {
      const columns: string[] = [];
      const placeholders: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      // Generate UUID for id if not provided
      if (!args.data.id) {
        columns.push("id");
        placeholders.push(`$${paramIndex++}`);
        values.push(crypto.randomUUID());
      }

      for (const [key, value] of Object.entries(args.data)) {
        const snakeKey = camelToSnake(key);
        columns.push(snakeKey);
        placeholders.push(`$${paramIndex++}`);
        values.push(value);
      }

      const query = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
      const result = await pool.query(query, values);
      return transformRow(result.rows[0]);
    },

    update: async (args: { where: { id: string }; data: UpdateData }) => {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(args.data)) {
        const snakeKey = camelToSnake(key);
        setClauses.push(`${snakeKey} = $${paramIndex++}`);
        values.push(value);
      }

      // Add updated_at
      setClauses.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(args.where.id);

      const query = `UPDATE ${tableName} SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, values);
      return result.rows[0] ? transformRow(result.rows[0]) : null;
    },

    delete: async (args: { where: { id: string } }) => {
      const query = `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`;
      const result = await pool.query(query, [args.where.id]);
      return result.rows[0] ? transformRow(result.rows[0]) : null;
    },

    count: async (args?: { where?: WhereClause }) => {
      let query = `SELECT COUNT(*) as count FROM ${tableName}`;
      const values: unknown[] = [];

      if (args?.where) {
        const whereClause = buildWhereClause(args.where);
        query += ` ${whereClause.text}`;
        values.push(...whereClause.values);
      }

      const result = await pool.query(query, values);
      return parseInt(result.rows[0].count, 10);
    },
  };
}

// Raw query support
async function $queryRaw(query: string, ...params: unknown[]) {
  const result = await pool.query(query, params);
  return result.rows.map(transformRow);
}

export const prisma = {
  clinic: createModel("clinics"),
  subscription: createModel("subscriptions"),
  channel: createModel("channels"),
  accessLog: createModel("access_logs"),
  ctaClick: createModel("cta_clicks"),
  diagnosisSession: createModel("diagnosis_sessions"),
  diagnosisType: createModel("diagnosis_types"),
  $queryRaw,
};
