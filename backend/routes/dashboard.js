const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

router.get('/summary', async (req, res) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayAgg, monthAgg, totalProducts, lowStockCount, totalCustomers, weekSales, recentSales, topProducts] =
    await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: todayStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: monthStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ $expr: { $lte: ['$stock', '$reorderLevel'] } }),
      Customer.countDocuments(),
      Sale.aggregate([
        { $match: { createdAt: { $gte: weekStart }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Sale.find({ status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }).limit(8),
      Sale.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            quantitySold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total' },
          },
        },
        { $sort: { quantitySold: -1 } },
        { $limit: 5 },
      ]),
    ]);

  res.json({
    todayRevenue: todayAgg[0]?.revenue || 0,
    todaySales: todayAgg[0]?.count || 0,
    monthRevenue: monthAgg[0]?.revenue || 0,
    monthSales: monthAgg[0]?.count || 0,
    totalProducts,
    lowStockCount,
    totalCustomers,
    weekSales,
    recentSales,
    topProducts,
  });
});

router.get('/low-stock', async (req, res) => {
  const products = await Product.find({ $expr: { $lte: ['$stock', '$reorderLevel'] }, isActive: true })
    .populate('category', 'name')
    .sort({ stock: 1 })
    .limit(50);
  res.json(products);
});

module.exports = router;
