const { admin, getDb } = require('../config/firebase');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

const clean = (str) => sanitizeHtml(str || '', { allowedTags: [], allowedAttributes: {} }).trim();

/**
 * GET /profile
 */
exports.getProfile = async (req, res) => {
  const db = getDb();
  const snap = await db.collection('users').doc(req.user.uid).get();
  const profile = snap.exists ? snap.data() : {};

  res.render('profile', {
    title: 'My Profile — Tureko',
    user: req.user,
    profile,
  });
};

/**
 * POST /profile
 */
exports.updateProfile = async (req, res) => {
  const db = getDb();
  const userRef = db.collection('users').doc(req.user.uid);

  const data = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  if (req.user.role === 'applicant') {
    data.name = clean(req.body.name) || req.user.name;
    data.bio = clean(req.body.bio);
    data.phone = clean(req.body.phone);
    data.location = clean(req.body.location);
    data.experience = clean(req.body.experience);
    data.availability = clean(req.body.availability);

    // Skills as array
    const skillsRaw = req.body.skills || '';
    data.skills = skillsRaw
      .split(',')
      .map(s => clean(s))
      .filter(s => s.length > 0)
      .slice(0, 15);

    data.profileComplete = !!(data.name && data.bio && data.location && data.skills.length > 0);
  } else if (req.user.role === 'business') {
    data.name = clean(req.body.name) || req.user.name;
    data.companyName = clean(req.body.companyName);
    data.industry = clean(req.body.industry);
    data.companySize = clean(req.body.companySize);
    data.website = clean(req.body.website);
    data.description = clean(req.body.description);
    data.location = clean(req.body.location);
    data.phone = clean(req.body.phone);

    data.profileComplete = !!(data.companyName && data.description && data.location);
  }

  await userRef.set(data, { merge: true });

  // Re-fetch
  const snap = await userRef.get();
  const profile = snap.data();

  res.render('profile', {
    title: 'My Profile — Tureko',
    user: { ...req.user, name: data.name || req.user.name },
    profile,
    success: 'Profile updated successfully!',
  });
};
