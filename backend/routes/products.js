const express = require('express');
const Product = require('../models/Product');
const escapeRegex = require('../utils/escapeRegex');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { search, category, lowStock, page = 1, limit = 20 } = req.query;
  const query = {};
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: re }, { sku: re }, { barcode: re }];
  }
  if (category) query.category = category;
  if (lowStock === 'true') query.$expr = { $lte: ['$stock', '$reorderLevel'] };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(query),
  ]);

  res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name');
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'SKU already exists' });
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'SKU already exists' });
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id/stock', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { adjustment, reason } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const next = product.stock + Number(adjustment || 0);
    if (next < 0) return res.status(400).json({ message: 'Stock cannot go below zero' });
    product.stock = next;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Product deleted' });
});

module.exports = router;
