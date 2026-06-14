const fs = require('fs');
const path = require('path');
const db = require('./database');

async function initDb() {
  const schemaPath = path.join(__dirname, 'schema_postgres.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  await db.query(schema);
  console.log('PostgreSQL database initialized.');
}

initDb()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });