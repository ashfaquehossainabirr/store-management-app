const express = require('express');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const CustomerPayment = require('../models/CustomerPayment');
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

router.get('/:id/ledger', async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });

  const [dueSales, payments] = await Promise.all([
    Sale.find({ customer: customer._id, dueAmount: { $gt: 0 }, status: { $ne: 'cancelled' } }).sort({ createdAt: 1 }),
    CustomerPayment.find({ customer: customer._id }).sort({ createdAt: -1 }),
  ]);

  const totalDue = dueSales.reduce((sum, s) => sum + s.dueAmount, 0);
  res.json({ customer, dueSales, totalDue, payments });
});

router.post('/:id/payments', authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Enter a valid payment amount' });

    const dueSales = await Sale.find({ customer: customer._id, dueAmount: { $gt: 0 }, status: { $ne: 'cancelled' } }).sort({
      createdAt: 1,
    });
    const totalDue = dueSales.reduce((sum, s) => sum + s.dueAmount, 0);
    if (totalDue <= 0) return res.status(400).json({ message: 'This customer has no outstanding balance' });
    if (amount > totalDue) {
      return res.status(400).json({ message: `Amount exceeds the total due of ${totalDue.toFixed(2)}` });
    }

    let remaining = amount;
    const appliedTo = [];
    for (const sale of dueSales) {
      if (remaining <= 0) break;
      const applied = Math.min(remaining, sale.dueAmount);
      sale.amountPaid += applied;
      sale.dueAmount -= applied;
      sale.paymentStatus = sale.dueAmount <= 0 ? 'paid' : 'partial';
      await sale.save();
      appliedTo.push({ sale: sale._id, invoiceNumber: sale.invoiceNumber, amount: applied });
      remaining -= applied;
    }

    const payment = await CustomerPayment.create({
      customer: customer._id,
      amount,
      note: req.body.note || '',
      appliedTo,
      recordedBy: req.user._id,
      recordedByName: req.user.name,
    });

    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
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
