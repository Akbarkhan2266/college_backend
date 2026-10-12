import jwt from 'jsonwebtoken';
import { User } from '../models.js';

/**
 * Authentication and Role Authorization Middleware
 * @param {string|string[]} roles - Single role or array of allowed roles (e.g. 'admin' or ['admin', 'student'])
 */
export const auth = (roles = 'admin') => {
  return async (req, res, next) => {
    try {
      // 1. Get token from httpOnly cookie or Authorization Bearer header
      let token = req.cookies?.token;
      if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No authentication token provided.',
        });
      }

      // 2. Verify token
      const secret = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';
      let decoded;
      try {
        decoded = jwt.verify(token, secret);
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired session token.',
        });
      }

      // 3. Query user from DB each request to verify status immediately
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User account not found.',
        });
      }

      // 4. Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact the administrator.',
        });
      }

      // 5. Check role authorization
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You do not have permission to access this resource.',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('[Auth Middleware Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.',
      });
    }
  };
};
