const { admin, getDb } = require('../config/firebase');
const sanitizeHtml = require('sanitize-html');

const clean = (str) => sanitizeHtml(str || '', { allowedTags: [], allowedAttributes: {} }).trim();

/**
 * GET /settings
 */
exports.getSettings = async (req, res) => {
  const db = getDb();
  const snap = await db.collection('users').doc(req.user.uid).get();
  const profile = snap.exists ? snap.data() : {};

  res.render('settings', {
    title: 'Settings — Tureko',
    user: req.user,
    profile,
  });
};

/**
 * POST /settings
 */
exports.updateSettings = async (req, res) => {
  const db = getDb();
  const { notifyEmail, notifyApplications } = req.body;

  await db.collection('users').doc(req.user.uid).set({
    notifications: {
      email: notifyEmail === 'on',
      applications: notifyApplications === 'on',
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  const snap = await db.collection('users').doc(req.user.uid).get();
  const profile = snap.data();

  res.render('settings', {
    title: 'Settings — Tureko',
    user: req.user,
    profile,
    success: 'Settings saved successfully!',
  });
};
