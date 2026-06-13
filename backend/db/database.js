const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { dbFile } = require('../config');

const dbPath = path.join(__dirname, dbFile);
const db = new sqlite3.Database(dbPath);

db.run('PRAGMA foreign_keys = ON');
db.run('PRAGMA journal_mode = WAL');

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

module.exports = { db, dbPath, all, get, run, exec };
