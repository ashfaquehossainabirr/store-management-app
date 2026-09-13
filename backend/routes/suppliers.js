const express = require('express');
const Supplier = require('../models/Supplier');
const escapeRegex = require('../utils/escapeRegex');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { search } = req.query;
  const query = {};
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: re }, { phone: re }, { email: re }, { contactPerson: re }];
  }
  const suppliers = await Supplier.find(query).sort({ createdAt: -1 });
  res.json(suppliers);
});

router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
  res.json({ message: 'Supplier deleted' });
});

module.exports = router;
