const jwt = require('jsonwebtoken');

/**
 * Verify the JWT sent in the Authorization: Bearer <token> header.
 * Attaches req.user = { id, email, role } on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'No token provided. Authorization header required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Role-based authorisation middleware factory.
 * @param  {...string} roles  - Allowed role names.
 * @returns Express middleware
 *
 * @example
 *   router.post('/admin', authenticate, authorize('admin'), handler)
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. Required role(s): ${roles.join(', ')}.`,
      });
    }

    next();
  };
}

module.exports = { authenticate, authorize };
