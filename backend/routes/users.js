const express = require('express');
const User = require('../models/User');
const escapeRegex = require('../utils/escapeRegex');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', authorize('admin', 'manager'), async (req, res) => {
  const { search } = req.query;
  const query = {};
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  const users = await User.find(query).sort({ createdAt: -1 });
  res.json(users.map((u) => u.toSafeObject()));
});

router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const user = await User.create({ name, email, password, role: role || 'cashier', phone });
    res.status(201).json(user.toSafeObject());
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email already in use' });
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { name, role, phone, isActive, password } = req.body;
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isMainAdmin && (role || isActive === false)) {
      return res.status(400).json({ message: "The main admin's role/status cannot be changed" });
    }
    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;
    await user.save();
    res.json(user.toSafeObject());
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.isMainAdmin) return res.status(400).json({ message: 'The main admin cannot be deleted' });
  await user.deleteOne();
  res.json({ message: 'User deleted' });
});

module.exports = router;
