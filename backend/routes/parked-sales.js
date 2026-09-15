const express = require('express');
const ParkedSale = require('../models/ParkedSale');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const items = await ParkedSale.find().sort({ createdAt: -1 }).limit(30);
  res.json(items);
});

router.post('/', async (req, res) => {
  try {
    const { label, items, customer, customerName } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    const parked = await ParkedSale.create({
      label: label || '',
      items,
      customer: customer || undefined,
      customerName: customerName || '',
      parkedBy: req.user._id,
      parkedByName: req.user.name,
    });
    res.status(201).json(parked);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const parked = await ParkedSale.findById(req.params.id);
  if (!parked) return res.status(404).json({ message: 'Parked sale not found' });
  await parked.deleteOne();
  res.json({ message: 'Parked sale removed' });
});

module.exports = router;
