/**
 * Validation middleware for common checks
 */
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ 
      message: 'Invalid ID format' 
    });
  }
  
  next();
};

/**
 * Sanitize input data
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
        
        // Prevent empty strings for required fields
        if (req.body[key] === '' && key !== 'bio' && key !== 'summary') {
          delete req.body[key];
        }
      }
    });
  }
  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({
      message: 'Invalid pagination parameters. Page must be >= 1, limit between 1-100'
    });
  }
  
  req.pagination = { page, limit };
  next();
};

module.exports = {
  validateObjectId,
  sanitizeInput,
  validatePagination
};