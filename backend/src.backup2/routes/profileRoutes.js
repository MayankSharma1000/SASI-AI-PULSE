const express = require('express');
const UserProfile = require('../models/UserProfile');

const router = express.Router();

// Create or update a user profile.
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      name,
      goal,
      interests,
      projectDescription
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          name: name || 'AI Explorer',
          goal: goal || 'student',
          interests: Array.isArray(interests) ? interests : [],
          projectDescription: projectDescription || ''
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    return res.json({
      profile: {
        ...profile.toObject(),
        id: profile.userId,
        topics: profile.interests
      }
    });
  } catch (error) {
    console.error('Profile save failed:', error.message);
    return res.status(500).json({ error: 'Failed to save profile.' });
  }
});

// Retrieve a profile.
router.get('/:userId', async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      userId: req.params.userId
    }).lean();

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.json({
      profile: {
        ...profile,
        id: profile.userId,
        topics: profile.interests
      }
    });
  } catch (error) {
    console.error('Profile retrieval failed:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

module.exports = router;
