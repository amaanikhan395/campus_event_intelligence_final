const fs = require('fs');
const path = require('path');
const { exec, db, dbPath } = require('./database');

async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await exec(schema);
  console.log(`Database initialized at ${dbPath}`);
}

if (require.main === module) {
  initDb()
    .then(() => db.close())
    .catch((error) => {
      console.error('Database initialization failed:', error.message);
      db.close();
      process.exit(1);
    });
}

module.exports = initDb;
