const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'sasi_session';

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

async function attachUser(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub).select('_id name email profileId onboardingCompleted');
    if (!user) return null;
    req.auth = { userId: user._id.toString(), name: user.name, email: user.email, profileId: user.profileId, onboardingCompleted: user.onboardingCompleted };
    return req.auth;
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  try {
    const auth = await attachUser(req);
    if (!auth) return res.status(401).json({ error: 'Please log in to continue.' });
    return next();
  } catch (error) {
    return next(error);
  }
}

async function optionalAuth(req, res, next) {
  try {
    await attachUser(req);
    return next();
  } catch (error) {
    return next(error);
  }
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

module.exports = { requireAuth, optionalAuth, setSessionCookie, clearSessionCookie };
