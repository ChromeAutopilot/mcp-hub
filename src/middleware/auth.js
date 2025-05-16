import config from '../config.js';

/**
 * Middleware to authenticate API requests using Bearer token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        timestamp: new Date().toISOString()
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (token !== config.mcpHubSecret) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid authorization token',
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during authentication',
      timestamp: new Date().toISOString()
    });
  }
};

export default authMiddleware;
