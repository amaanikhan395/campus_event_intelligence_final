const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'You must be logged in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired login token.' });
  }
}

function requireVerified(req, res, next) {
  if (!req.user?.is_verified) {
    return res.status(403).json({ error: 'Please verify your email before doing this.' });
  }

  next();
}

module.exports = { requireAuth, requireVerified };