/**
 * Global error handling middleware.
 * Catches all unhandled errors and returns a consistent JSON response.
 */
function errorHandler(err, req, res, _next) {
  console.error('[ERROR]', err.stack || err.message || err);

  // Validation errors from express-validator
  if (err.type === 'validation') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors,
    });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 10MB.',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field.',
    });
  }

  // ─── PostgreSQL error codes ───────────────────────────────────────
  // https://www.postgresql.org/docs/current/errcodes-appendix.html
  switch (err.code) {
    case '23505': // unique_violation
    case '23000': // integrity_constraint_violation
      return res.status(409).json({
        success: false,
        error: 'A record with this value already exists.',
      });
    case '23503': // foreign_key_violation
      return res.status(400).json({
        success: false,
        error: 'Referenced record does not exist.',
      });
    case '23514': // check_violation
      return res.status(400).json({
        success: false,
        error: 'Value is not allowed for this field.',
      });
    case '22P02': // invalid_text_representation (e.g. malformed UUID)
      return res.status(400).json({
        success: false,
        error: 'Invalid identifier or value format.',
      });
    case 'XX000': // internal_error — PostGIS geometry failures land here
      if (err.message && /geometry|geojson|srid/i.test(err.message)) {
        return res.status(400).json({
          success: false,
          error: `Invalid geometry: ${err.message}`,
        });
      }
      break;
    case 'ECONNREFUSED':
      return res.status(503).json({
        success: false,
        error: 'Database unavailable. Start the spatial database with: docker compose up -d',
      });
    default:
      break;
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 handler for unmatched routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
