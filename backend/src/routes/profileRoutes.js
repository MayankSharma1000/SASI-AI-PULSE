const express = require('express');
const UserProfile = require('../models/UserProfile');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

// Authenticated users can only read or update the profile linked to their account.
router.post('/', async (req, res) => {
  try {
    const { name, goal, interests, projectDescription } = req.body;
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.auth.profileId },
      { $set: {
        name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 80) : req.auth.name,
        goal: typeof goal === 'string' ? goal : 'student',
        interests: Array.isArray(interests) ? [...new Set(interests.filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean))].slice(0, 30) : [],
        projectDescription: typeof projectDescription === 'string' ? projectDescription.trim().slice(0, 1000) : ''
      } },
      { new: true, runValidators: true }
    );
    if (!profile) return res.status(404).json({ error: 'User profile not found.' });
    return res.json({ profile: { ...profile.toObject(), id: profile.userId, topics: profile.interests, project: profile.projectDescription } });
  } catch (error) {
    console.error('Profile save failed:', error.message);
    return res.status(500).json({ error: 'Failed to save profile.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.auth.profileId }).lean();
    if (!profile) return res.status(404).json({ error: 'User profile not found.' });
    return res.json({ profile: { ...profile, id: profile.userId, topics: profile.interests, project: profile.projectDescription } });
  } catch (error) {
    console.error('Profile retrieval failed:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// Keep the old URL shape temporarily, but never allow it to select another profile.
router.get('/:userId', async (req, res) => {
  if (req.params.userId !== req.auth.profileId) return res.status(403).json({ error: 'You cannot access another user profile.' });
  try {
    const profile = await UserProfile.findOne({ userId: req.auth.profileId }).lean();
    if (!profile) return res.status(404).json({ error: 'User profile not found.' });
    return res.json({ profile: { ...profile, id: profile.userId, topics: profile.interests, project: profile.projectDescription } });
  } catch (error) {
    console.error('Profile retrieval failed:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

module.exports = router;
