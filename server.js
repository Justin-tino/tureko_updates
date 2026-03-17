require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initFirebase } = require('./config/firebase');
const { attachUser } = require('./middleware/auth');

const app = express();

// Initialize Firebase
initFirebase();

// Security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://www.gstatic.com',
          'https://apis.google.com',
          'https://accounts.google.com',
        ],
        imgSrc: ["'self'", 'data:', 'https://storage.googleapis.com', 'https://lh3.googleusercontent.com', 'https://*.googleusercontent.com'],
        frameSrc: ["'self'", 'https://accounts.google.com', 'https://*.firebaseapp.com', 'https://*.firebaseio.com'],
        connectSrc: [
          "'self'",
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
          'https://www.googleapis.com',
          'https://accounts.google.com',
        ],
      },
    },
  })
);

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Body parsing (limit size)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Attach user to all requests (non-blocking)
app.use(attachUser);

// Routes
const routes = require('./routes/index');
const authRoutes = require('./routes/auth');
const platformRoutes = require('./routes/platform');
app.use('/', routes);
app.use('/', authRoutes);
app.use('/', platformRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { title: '404 — Tureko', message: 'Page not found.' });
});

// Error handler (no stack traces in production)
app.use((err, req, res, next) => {
  console.error(err.message);
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message;
  res.status(500).render('error', { title: 'Error — Tureko', message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Tureko server running on port ${PORT}`);
});
