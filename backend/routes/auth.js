const express = require('express');
const { get, run } = require('../db/database');
const { badRequest } = require('../middleware/errors');

const router = express.Router();

router.post('/signup', async (req, res, next) => {
  try {
    const fullName = (req.body.full_name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const role = req.body.role || 'Student';
    if (!fullName || !email) throw badRequest('Full name and email are required');
    let user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      const result = await run('INSERT INTO users (full_name, email, role) VALUES (?, ?, ?)', [fullName, email, role]);
      user = await get('SELECT * FROM users WHERE user_id = ?', [result.id]);
    }
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) throw badRequest('Email is required');
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(404).json({ error: 'Account not found. Create an account first.' });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
