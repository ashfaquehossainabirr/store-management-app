const express = require('express');
const StockAdjustment = require('../models/StockAdjustment');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { product, type, page = 1, limit = 20 } = req.query;
  const query = {};
  if (product) query.product = product;
  if (type) query.type = type;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    StockAdjustment.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    StockAdjustment.countDocuments(query),
  ]);

  res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

module.exports = router;
