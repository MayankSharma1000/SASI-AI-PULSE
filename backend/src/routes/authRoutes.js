const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const { requireAuth, setSessionCookie, clearSessionCookie } = require('../middleware/authMiddleware');

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again in 15 minutes.' }
});

function issueSession(user, res) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
  }
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: user._id.toString(),
    expiresIn: '7d',
    algorithm: 'HS256'
  });
  setSessionCookie(res, token);
}

function publicUser(user, profile) {
  return {
    user: { id: user._id.toString(), name: user.name, email: user.email, onboardingCompleted: user.onboardingCompleted },
    profile: profile ? {
      ...profile.toObject(),
      id: profile.userId,
      topics: profile.interests,
      project: profile.projectDescription
    } : null
  };
}

router.post('/register', authLimiter, async (req, res) => {
  let createdProfile;
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(500).json({ error: 'Authentication is not configured. Set JWT_SECRET in backend/.env.' });

    const existing = await User.findOne({ email }).select('_id');
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const profileId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    createdProfile = await UserProfile.create({
      userId: profileId,
      name,
      goal: 'student',
      interests: [],
      projectDescription: ''
    });
    const user = await User.create({ name, email, passwordHash, profileId, onboardingCompleted: false });
    issueSession(user, res);
    return res.status(201).json({ ...publicUser(user, createdProfile), message: 'Account created.' });
  } catch (error) {
    if (createdProfile) await UserProfile.deleteOne({ _id: createdProfile._id }).catch(() => {});
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error('Registration failed:', error.message);
    return res.status(500).json({ error: error.message.includes('JWT_SECRET') ? error.message : 'Could not create your account.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(500).json({ error: 'Authentication is not configured. Set JWT_SECRET in backend/.env.' });

    const user = await User.findOne({ email }).select('+passwordHash');
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!valid) return res.status(401).json({ error: 'Email or password is incorrect.' });

    const profile = await UserProfile.findOne({ userId: user.profileId });
    if (!profile) return res.status(500).json({ error: 'Your profile could not be loaded. Please contact support.' });
    issueSession(user, res);
    return res.json({ ...publicUser(user, profile), message: 'Signed in.' });
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({ error: 'Could not sign in.' });
  }
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  return res.json({ message: 'Signed out.' });
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    const profile = await UserProfile.findOne({ userId: req.auth.profileId });
    if (!user || !profile) return res.status(401).json({ error: 'Session is no longer valid.' });
    return res.json(publicUser(user, profile));
  } catch (error) {
    console.error('Session restore failed:', error.message);
    return res.status(500).json({ error: 'Could not restore your session.' });
  }
});

router.patch('/onboarding', requireAuth, async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.auth.profileId },
      { $set: {
        name: req.auth.name,
        goal: typeof req.body.goal === 'string' ? req.body.goal : 'student',
        interests: Array.isArray(req.body.interests) ? [...new Set(req.body.interests.filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean))].slice(0, 30) : [],
        projectDescription: typeof req.body.projectDescription === 'string' ? req.body.projectDescription.trim().slice(0, 1000) : ''
      } },
      { new: true, runValidators: true }
    );
    const user = await User.findByIdAndUpdate(req.auth.userId, { $set: { onboardingCompleted: true } }, { new: true });
    return res.json({ ...publicUser(user, profile), message: 'Preferences saved.' });
  } catch (error) {
    console.error('Onboarding save failed:', error.message);
    return res.status(500).json({ error: 'Could not save your preferences.' });
  }
});

module.exports = router;
