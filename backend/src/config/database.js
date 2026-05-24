const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

/**
 * Execute a parameterised SQL query.
 * @param {string} text  - SQL statement
 * @param {Array}  params - Bound parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV !== 'production') {
    console.log('Executed query:', { text, duration, rows: result.rowCount });
  }

  return result;
}

module.exports = { pool, query };
