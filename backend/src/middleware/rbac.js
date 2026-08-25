const { ROLES } = require('../config/constants');

/**
 * Role-Based Access Control middleware factory.
 * Usage: rbac('DLAO', 'SGA') — allows only those roles.
 * Usage: rbac() — allows any authenticated user.
 */
function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    // If no roles specified, allow any authenticated user
    if (allowedRoles.length === 0) {
      return next();
    }

    // ADMIN always has access
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = { rbac };
