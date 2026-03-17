const { admin, getDb } = require('../config/firebase');

// Firebase web config passed to the client-side EJS templates
function getFirebaseConfig() {
  return {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
  };
}

/**
 * GET /signin — Render sign-in / sign-up page
 */
exports.getSignIn = (req, res) => {
  // Already logged in? Go to dashboard.
  if (res.locals.user) {
    return res.redirect('/dashboard');
  }
  res.render('signin', {
    title: 'Sign In — Tureko',
    firebaseConfig: JSON.stringify(getFirebaseConfig()),
  });
};

/**
 * POST /auth/session-login
 * Receives Firebase ID token from client, creates a secure session cookie.
 */
exports.sessionLogin = async (req, res) => {
  const { idToken, role } = req.body;
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ error: 'Missing ID token.' });
  }

  // Validate role if provided
  const validRoles = ['applicant', 'business'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  // 5-day session
  const expiresIn = 5 * 24 * 60 * 60 * 1000;

  try {
    // Verify the ID token first
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Only allow tokens minted recently (within 5 minutes) to prevent replay
    const authTime = decoded.auth_time * 1000;
    if (Date.now() - authTime > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Please sign in again.' });
    }

    // Create session cookie
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    // Save / update user profile in Firestore
    const db = getDb();
    const userRef = db.collection('users').doc(decoded.uid);
    const userData = {
      email: decoded.email,
      name: decoded.name || decoded.email.split('@')[0],
      picture: decoded.picture || null,
      emailVerified: decoded.email_verified || false,
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Only set role if provided (first-time sign-up) — never overwrite existing role
    if (role) {
      const existingDoc = await userRef.get();
      if (!existingDoc.exists || !existingDoc.data().role) {
        userData.role = role;
      }
    }

    await userRef.set(userData, { merge: true });

    // If user doc has no createdAt, set it
    const snap = await userRef.get();
    if (!snap.data().createdAt) {
      await userRef.update({ createdAt: admin.firestore.FieldValue.serverTimestamp() });
    }

    // Set cookie
    const cookieOptions = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    };
    res.cookie('__session', sessionCookie, cookieOptions);

    return res.status(200).json({
      status: 'success',
      emailVerified: decoded.email_verified || false,
    });
  } catch (err) {
    console.error('Session login error:', err.message);
    return res.status(401).json({ error: 'Unauthorized. Invalid token.' });
  }
};

/**
 * POST /auth/session-logout
 */
exports.sessionLogout = async (req, res) => {
  const sessionCookie = req.cookies.__session || '';

  // Always clear the session cookie first
  res.clearCookie('__session', { path: '/' });

  if (sessionCookie) {
    try {
      // Use checkRevoked=false here since we're about to revoke anyway
      const decoded = await admin.auth().verifySessionCookie(sessionCookie, false);
      await admin.auth().revokeRefreshTokens(decoded.uid);
    } catch (err) {
      // Cookie already invalid or expired — that's fine, just continue with redirect
    }
  }
  return res.redirect('/signin');
};

/**
 * GET /auth/check-verification
 * Called by client JS to poll email verification status.
 */
exports.checkVerification = async (req, res) => {
  const sessionCookie = req.cookies.__session || '';
  if (!sessionCookie) {
    return res.status(401).json({ verified: false });
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    const userRecord = await admin.auth().getUser(decoded.uid);
    return res.json({ verified: userRecord.emailVerified });
  } catch (err) {
    return res.status(401).json({ verified: false });
  }
};

/**
 * GET /verify-email
 */
exports.getVerifyEmail = (req, res) => {
  res.render('verify-email', {
    title: 'Verify Email — Tureko',
    firebaseConfig: JSON.stringify(getFirebaseConfig()),
  });
};

/**
 * GET /dashboard
 */
exports.getDashboard = async (req, res) => {
  const db = getDb();
  const stats = { jobs: 0, applications: 0 };

  try {
    if (req.user.role === 'business') {
      const jobSnap = await db.collection('jobs')
        .where('businessId', '==', req.user.uid).get();
      stats.jobs = jobSnap.size;
      const appSnap = await db.collection('jobApplications')
        .where('businessId', '==', req.user.uid).get();
      stats.applications = appSnap.size;
    } else if (req.user.role === 'applicant') {
      const jobSnap = await db.collection('jobs')
        .where('status', '==', 'open').get();
      stats.jobs = jobSnap.size;
      const appSnap = await db.collection('jobApplications')
        .where('applicantId', '==', req.user.uid).get();
      stats.applications = appSnap.size;
    }
  } catch (err) { /* stats are optional */ }

  res.render('dashboard', {
    title: 'Dashboard — Tureko',
    user: req.user,
    stats,
  });
};
