// If USE_MOCK_DB=true, use the in-memory mock (no PostgreSQL needed)
if (process.env.USE_MOCK_DB === 'true') {
  module.exports = require('./mockDatabase');
} else {
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

  async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query:', { text: text.slice(0, 60), duration, rows: result.rowCount });
    }
    return result;
  }

  module.exports = { pool, query };
}
