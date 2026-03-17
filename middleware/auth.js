const { admin, getDb } = require('../config/firebase');

/**
 * Attach user info (non-blocking) — runs on every request.
 * Fetches role from Firestore so views can adapt.
 */
async function attachUser(req, res, next) {
  res.locals.user = null;
  const sessionCookie = req.cookies.__session || '';
  if (!sessionCookie) return next();

  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    const userObj = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.email.split('@')[0],
      picture: decoded.picture || null,
      emailVerified: decoded.email_verified,
    };

    // Fetch role + profileComplete from Firestore
    const db = getDb();
    const snap = await db.collection('users').doc(decoded.uid).get();
    if (snap.exists) {
      const data = snap.data();
      userObj.role = data.role || null;
      userObj.profileComplete = data.profileComplete || false;
    }

    res.locals.user = userObj;
  } catch (err) {
    res.clearCookie('__session', { path: '/' });
  }
  next();
}

/**
 * Require authenticated user — redirects to /signin if not logged in.
 * Also fetches role from Firestore.
 */
async function requireAuth(req, res, next) {
  const sessionCookie = req.cookies.__session || '';
  if (!sessionCookie) {
    return res.redirect('/signin');
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.email.split('@')[0],
      picture: decoded.picture || null,
      emailVerified: decoded.email_verified,
    };

    // Fetch role + profile data from Firestore
    const db = getDb();
    const snap = await db.collection('users').doc(decoded.uid).get();
    if (snap.exists) {
      const data = snap.data();
      req.user.role = data.role || null;
      req.user.profileComplete = data.profileComplete || false;
      req.user.companyName = data.companyName || null;
    }

    next();
  } catch (err) {
    res.clearCookie('__session', { path: '/' });
    return res.redirect('/signin');
  }
}

/**
 * Require a specific role — 403 if wrong role.
 */
function requireRole(role) {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      return next();
    }
    return res.status(403).render('error', {
      title: '403 — Tureko',
      message: 'You do not have permission to access this page.',
    });
  };
}

module.exports = { attachUser, requireAuth, requireRole };
