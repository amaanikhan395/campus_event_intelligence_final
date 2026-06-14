const { Pool } = require('pg');
require('dotenv').config();

const isRenderDatabase =
  process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderDatabase ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};