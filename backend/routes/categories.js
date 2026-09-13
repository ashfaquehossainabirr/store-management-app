const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json(categories);
});

router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const category = await Category.create({ name: name.trim(), description });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Category already exists' });
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  const inUse = await Product.countDocuments({ category: req.params.id });
  if (inUse > 0) {
    return res.status(400).json({ message: `Cannot delete — ${inUse} product(s) use this category` });
  }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found' });
  res.json({ message: 'Category deleted' });
});

module.exports = router;
