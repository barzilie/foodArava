// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes - verify token
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token payload (excluding password if it existed)
      // Attaching the user object to the request
      req.user = await User.findById(decoded.user.id).select('-password'); // Ensure password is never selected if schema changes

      if (!req.user) {
          // Handle case where user associated with token no longer exists
           return res.status(401).json({ message: 'משתמש לא נמצא' });
      }
      else if (!token) {
        res.status(401).json({ message: 'אימות נכשל, לא סופק טוקן' });
      }

      next(); // Move to the next middleware/route handler
    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401).json({ message: 'אימות נכשל, טוקן לא תקין' });
    }
  }
};

// Middleware to check for admin privileges
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next(); // User is admin, proceed
  } else {
    res.status(403).json({ message: 'נדרשות הרשאות מנהל' }); // 403 Forbidden
  }
};

module.exports = { protect, admin };