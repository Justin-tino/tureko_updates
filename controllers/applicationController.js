const { admin, getDb } = require('../config/firebase');

/**
 * GET /applications — Role-specific application list
 */
exports.getApplications = async (req, res) => {
  const db = getDb();
  let query;

  if (req.user.role === 'applicant') {
    // Applicant sees their own applications
    query = db.collection('jobApplications')
      .where('applicantId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50);
  } else if (req.user.role === 'business') {
    // Business sees applications received for their jobs
    query = db.collection('jobApplications')
      .where('businessId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50);
  } else {
    return res.redirect('/dashboard');
  }

  const snapshot = await query.get();
  const applications = [];
  snapshot.forEach(doc => {
    applications.push({ id: doc.id, ...doc.data() });
  });

  res.render('applications', {
    title: req.user.role === 'business' ? 'Applications Received — Tureko' : 'My Applications — Tureko',
    user: req.user,
    applications,
  });
};

/**
 * POST /applications/:id/status — Business updates application status
 */
exports.updateApplicationStatus = async (req, res) => {
  const db = getDb();
  const appDoc = await db.collection('jobApplications').doc(req.params.id).get();

  if (!appDoc.exists) {
    return res.status(404).render('error', { title: '404 — Tureko', message: 'Application not found.' });
  }

  const appData = appDoc.data();

  // Only the business that owns the job can update
  if (appData.businessId !== req.user.uid) {
    return res.status(403).render('error', { title: '403 — Tureko', message: 'Not authorized.' });
  }

  const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
  const newStatus = req.body.status;

  if (!validStatuses.includes(newStatus)) {
    return res.status(400).render('error', { title: '400 — Tureko', message: 'Invalid status.' });
  }

  await db.collection('jobApplications').doc(req.params.id).update({
    status: newStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Redirect back to where they came from
  const returnTo = req.body.returnTo || '/applications';
  res.redirect(returnTo);
};
