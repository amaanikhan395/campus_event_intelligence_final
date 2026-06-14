const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createJwt(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_verified: user.is_verified
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Verification link:', verifyUrl);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your Rutgers Events account',
    html: `
      <h2>Verify your Rutgers Events account</h2>
      <p>Click the link below to verify your account:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
    `
  });
}

router.post('/signup', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await db.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, is_verified`,
      [full_name, email.toLowerCase(), passwordHash]
    );

    const user = userResult.rows[0];

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    await db.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [user.id, tokenHash]
    );

    await sendVerificationEmail(user.email, rawToken);

    res.status(201).json({
      message: 'Account created. Please check your email to verify your account.',
      user
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      `SELECT id, full_name, email, password_hash, is_verified
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = createJwt(user);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        is_verified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Could not log in.' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send('Missing verification token.');
    }

    const tokenHash = hashToken(token);

    const result = await db.query(
      `SELECT evt.id, evt.user_id, evt.used_at, evt.expires_at, u.is_verified
       FROM email_verification_tokens evt
       JOIN users u ON u.id = evt.user_id
       WHERE evt.token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).send('Invalid verification link.');
    }

    const record = result.rows[0];

    if (record.used_at) {
      return res.status(400).send('This verification link has already been used.');
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).send('This verification link has expired.');
    }

    if (record.is_verified) {
      return res.status(400).send('This account is already verified.');
    }

    await db.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [record.user_id]);

    await db.query('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1', [
      record.id
    ]);

    res.send(`
      <h1>Email verified</h1>
      <p>Your Rutgers Events account is now verified. You can close this page and log in.</p>
      <a href="/login.html">Go to login</a>
    `);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).send('Could not verify email.');
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await db.query(
    `SELECT id, full_name, email, is_verified, created_at
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({ user: result.rows[0] });
});

router.delete('/account', requireAuth, async (req, res) => {
  await db.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [req.user.id]);

  res.json({ message: 'Account deleted.' });
});

module.exports = router;