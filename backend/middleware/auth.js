const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'device_tracker_secret_2026';

function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token. Please log in.' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    next();
  });
}

module.exports = { requireAuth, requireAdmin };