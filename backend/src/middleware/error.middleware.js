function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, _req, res, _next) {
  const status = error.message === 'CORS policy: origin is not allowed.' ? 403 : (error.status || 500);
  if (status >= 500) console.error('[APES API error]', error);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : error.message });
}

module.exports = { errorHandler, notFoundHandler };
