require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  env: process.env.NODE_ENV || 'development',
  dbFile: process.env.DB_FILE || 'campus_events.db'
};
