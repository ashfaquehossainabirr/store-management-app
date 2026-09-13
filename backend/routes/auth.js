const express = require('express');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/auth');

const router = express.Router();

// First-time setup: register the initial admin only if no users exist yet.
router.post('/register', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      return res.status(403).json({ message: 'Registration is closed. Ask an admin to create your account.' });
    }
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const user = await User.create({ name, email, password, role: 'admin', isMainAdmin: true });
    const token = generateToken(user);
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email already in use' });
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ message: 'This account has been deactivated' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });
    const token = generateToken(user);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

router.get('/setup-status', async (req, res) => {
  const count = await User.countDocuments();
  res.json({ needsSetup: count === 0 });
});

module.exports = router;
