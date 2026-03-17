const { admin, getDb } = require('../config/firebase');
const sanitizeHtml = require('sanitize-html');

const clean = (str) => sanitizeHtml(str || '', { allowedTags: [], allowedAttributes: {} }).trim();

// Job categories
const JOB_CATEGORIES = [
  'Eco-Chef', 'Sustainability Officer', 'Eco-Tour Guide',
  'Environmental Compliance Manager', 'Green Operations Consultant',
  'Climate Program Coordinator', 'Waste Management Specialist',
  'ESG Reporting Officer', 'Sustainable Procurement Specialist',
  'Carbon Analyst', 'Renewable Energy Technician', 'Other',
];

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'freelance'];

/**
 * GET /jobs — Job board listing
 */
exports.getJobBoard = async (req, res) => {
  const db = getDb();
  let jobsQuery;

  if (req.user.role === 'business') {
    // Business sees their own jobs
    jobsQuery = db.collection('jobs')
      .where('businessId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50);
  } else {
    // Applicants see open jobs
    jobsQuery = db.collection('jobs')
      .where('status', '==', 'open')
      .orderBy('createdAt', 'desc')
      .limit(50);
  }

  const snapshot = await jobsQuery.get();
  const jobs = [];
  snapshot.forEach(doc => {
    jobs.push({ id: doc.id, ...doc.data() });
  });

  res.render('jobs', {
    title: req.user.role === 'business' ? 'My Job Listings — Tureko' : 'Job Board — Tureko',
    user: req.user,
    jobs,
    categories: JOB_CATEGORIES,
  });
};

/**
 * GET /jobs/post — Post job form (business only)
 */
exports.getPostJob = (req, res) => {
  res.render('post-job', {
    title: 'Post a Job — Tureko',
    user: req.user,
    categories: JOB_CATEGORIES,
    jobTypes: JOB_TYPES,
    formData: {},
  });
};

/**
 * POST /jobs/post — Save new job (business only)
 */
exports.postJob = async (req, res) => {
  const { title, description, requirements, location, salaryRange, type, category } = req.body;

  // Validate
  if (!title || !description || !location || !type || !category) {
    return res.render('post-job', {
      title: 'Post a Job — Tureko',
      user: req.user,
      categories: JOB_CATEGORIES,
      jobTypes: JOB_TYPES,
      formData: req.body,
      errors: [{ msg: 'Please fill in all required fields.' }],
    });
  }

  const db = getDb();

  // Get company name from user profile
  const userSnap = await db.collection('users').doc(req.user.uid).get();
  const businessName = userSnap.exists ? (userSnap.data().companyName || req.user.name) : req.user.name;

  const jobData = {
    title: clean(title),
    description: clean(description),
    requirements: clean(requirements),
    location: clean(location),
    salaryRange: clean(salaryRange),
    type: clean(type),
    category: clean(category),
    businessId: req.user.uid,
    businessName,
    status: 'open',
    applicantCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('jobs').add(jobData);
  res.redirect('/jobs');
};

/**
 * GET /jobs/:id — Job detail
 */
exports.getJobDetail = async (req, res) => {
  const db = getDb();
  const jobDoc = await db.collection('jobs').doc(req.params.id).get();

  if (!jobDoc.exists) {
    return res.status(404).render('error', { title: '404 — Tureko', message: 'Job not found.' });
  }

  const job = { id: jobDoc.id, ...jobDoc.data() };

  // Check if applicant already applied
  let alreadyApplied = false;
  if (req.user.role === 'applicant') {
    const existing = await db.collection('jobApplications')
      .where('jobId', '==', job.id)
      .where('applicantId', '==', req.user.uid)
      .limit(1)
      .get();
    alreadyApplied = !existing.empty;
  }

  // If business, get applications for this job
  let applications = [];
  if (req.user.role === 'business' && job.businessId === req.user.uid) {
    const appSnap = await db.collection('jobApplications')
      .where('jobId', '==', job.id)
      .orderBy('createdAt', 'desc')
      .get();
    appSnap.forEach(doc => {
      applications.push({ id: doc.id, ...doc.data() });
    });
  }

  res.render('job-detail', {
    title: `${job.title} — Tureko`,
    user: req.user,
    job,
    alreadyApplied,
    applications,
  });
};

/**
 * POST /jobs/:id/apply — Submit application (applicant only)
 */
exports.applyToJob = async (req, res) => {
  const db = getDb();
  const jobDoc = await db.collection('jobs').doc(req.params.id).get();

  if (!jobDoc.exists || jobDoc.data().status !== 'open') {
    return res.status(404).render('error', { title: '404 — Tureko', message: 'Job not available.' });
  }

  // Check if already applied
  const existing = await db.collection('jobApplications')
    .where('jobId', '==', req.params.id)
    .where('applicantId', '==', req.user.uid)
    .limit(1)
    .get();

  if (!existing.empty) {
    return res.redirect(`/jobs/${req.params.id}`);
  }

  const job = jobDoc.data();
  const coverLetter = clean(req.body.coverLetter);

  await db.collection('jobApplications').add({
    jobId: req.params.id,
    jobTitle: job.title,
    applicantId: req.user.uid,
    applicantName: req.user.name,
    applicantEmail: req.user.email,
    businessId: job.businessId,
    coverLetter,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Increment applicant count
  await db.collection('jobs').doc(req.params.id).update({
    applicantCount: admin.firestore.FieldValue.increment(1),
  });

  res.redirect(`/jobs/${req.params.id}`);
};

/**
 * POST /jobs/:id/status — Toggle job status (business only)
 */
exports.updateJobStatus = async (req, res) => {
  const db = getDb();
  const jobDoc = await db.collection('jobs').doc(req.params.id).get();

  if (!jobDoc.exists || jobDoc.data().businessId !== req.user.uid) {
    return res.status(403).render('error', { title: '403 — Tureko', message: 'Not authorized.' });
  }

  const newStatus = jobDoc.data().status === 'open' ? 'closed' : 'open';
  await db.collection('jobs').doc(req.params.id).update({
    status: newStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.redirect(`/jobs/${req.params.id}`);
};

exports.JOB_CATEGORIES = JOB_CATEGORIES;
exports.JOB_TYPES = JOB_TYPES;
