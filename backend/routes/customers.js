const express = require('express');
const Customer = require('../models/Customer');
const escapeRegex = require('../utils/escapeRegex');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { search } = req.query;
  const query = {};
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: re }, { phone: re }, { email: re }];
  }
  const customers = await Customer.find(query).sort({ createdAt: -1 });
  res.json(customers);
});

router.get('/:id', async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  res.json(customer);
});

router.post('/', authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  res.json({ message: 'Customer deleted' });
});

module.exports = router;
