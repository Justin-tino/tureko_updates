const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const profileController = require('../controllers/profileController');
const jobController = require('../controllers/jobController');
const applicationController = require('../controllers/applicationController');
const settingsController = require('../controllers/settingsController');

// All routes require authentication
router.use(requireAuth);

// ---- PROFILE ----
router.get('/profile', profileController.getProfile);
router.post('/profile', profileController.updateProfile);

// ---- JOBS ----
router.get('/jobs', jobController.getJobBoard);
router.get('/jobs/post', requireRole('business'), jobController.getPostJob);
router.post('/jobs/post', requireRole('business'), jobController.postJob);
router.get('/jobs/:id', jobController.getJobDetail);
router.post('/jobs/:id/apply', requireRole('applicant'), jobController.applyToJob);
router.post('/jobs/:id/status', requireRole('business'), jobController.updateJobStatus);

// ---- APPLICATIONS ----
router.get('/applications', applicationController.getApplications);
router.post('/applications/:id/status', requireRole('business'), applicationController.updateApplicationStatus);

// ---- SETTINGS ----
router.get('/settings', settingsController.getSettings);
router.post('/settings', settingsController.updateSettings);

module.exports = router;
