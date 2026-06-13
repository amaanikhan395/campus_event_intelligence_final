function notFound(req, res, next) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  if (status === 500) console.error(err);
  res.status(status).json({ error: message });
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

module.exports = { notFound, errorHandler, badRequest };
