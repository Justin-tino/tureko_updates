const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Sign-in page
router.get('/signin', authController.getSignIn);

// Session login (receives Firebase ID token)
router.post(
  '/auth/session-login',
  authLimiter,
  [
    body('idToken')
      .trim()
      .notEmpty()
      .withMessage('ID token is required.')
      .isString(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
  },
  authController.sessionLogin
);

// Session logout
router.post('/auth/session-logout', authController.sessionLogout);

// Check email verification status (polling endpoint)
router.get('/auth/check-verification', authController.checkVerification);

// Verify email page
router.get('/verify-email', authController.getVerifyEmail);

// Dashboard (protected)
router.get('/dashboard', requireAuth, authController.getDashboard);

module.exports = router;
