/**
 * Authentication middleware to protect routes
 * Checks if user is authenticated via session
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // For API routes, return JSON error
  if (req.path.startsWith('/api/') || req.accepts('json')) {
    return res.status(401).json({ 
      message: 'Please log in to access this resource',
      loginUrl: '/auth/github'
    });
  }
  
  // For web routes, redirect to login
  res.redirect('/auth/github');
};

/**
 * Optional: Admin role checking middleware
 */
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ 
    message: 'Admin access required' 
  });
};

/**
 * Optional authentication - proceeds whether authenticated or not
 */
const optionalAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    req.authenticated = true;
  } else {
    req.authenticated = false;
  }
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  optionalAuth
};