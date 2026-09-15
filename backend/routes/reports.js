const express = require('express');
const Sale = require('../models/Sale');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.use(authorize('admin', 'manager'));

function parseRange(query) {
  const now = new Date();
  const to = query.to ? new Date(new Date(query.to).setHours(23, 59, 59, 999)) : now;
  const from = query.from
    ? new Date(new Date(query.from).setHours(0, 0, 0, 0))
    : new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to };
}

router.get('/summary', async (req, res) => {
  const { from, to } = parseRange(req.query);
  const match = { createdAt: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } };

  const [saleAgg, dailyAgg, cashierAgg, itemFacets] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: '$total' }, refunded: { $sum: '$refundedAmount' }, salesCount: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          salesCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      { $match: match },
      { $group: { _id: '$cashierName', revenue: { $sum: '$total' }, salesCount: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
    ]),
    Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
      { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $addFields: { lineCost: { $multiply: ['$items.quantity', { $ifNull: ['$prod.costPrice', 0] }] } } },
      { $addFields: { lineProfit: { $subtract: ['$items.total', '$lineCost'] } } },
      {
        $facet: {
          totals: [
            { $group: { _id: null, cost: { $sum: '$lineCost' }, profit: { $sum: '$lineProfit' }, itemsSold: { $sum: '$items.quantity' } } },
          ],
          byCategory: [
            {
              $group: {
                _id: { $ifNull: ['$cat.name', 'Uncategorized'] },
                revenue: { $sum: '$items.total' },
                cost: { $sum: '$lineCost' },
                profit: { $sum: '$lineProfit' },
                qty: { $sum: '$items.quantity' },
              },
            },
            { $sort: { revenue: -1 } },
          ],
          topProducts: [
            { $group: { _id: '$items.name', qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' }, profit: { $sum: '$lineProfit' } } },
            { $sort: { qty: -1 } },
            { $limit: 8 },
          ],
        },
      },
    ]),
  ]);

  const saleTotals = saleAgg[0] || { revenue: 0, refunded: 0, salesCount: 0 };
  const itemTotals = (itemFacets[0] && itemFacets[0].totals[0]) || { cost: 0, profit: 0, itemsSold: 0 };
  const revenue = saleTotals.revenue - saleTotals.refunded;
  // Refunds reduce realized profit too; this is an approximation since refund cost isn't tracked per-line.
  const profit = itemTotals.profit - saleTotals.refunded;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

  res.json({
    range: { from, to },
    totals: {
      revenue,
      grossRevenue: saleTotals.revenue,
      refunded: saleTotals.refunded,
      cost: itemTotals.cost,
      profit,
      marginPct,
      salesCount: saleTotals.salesCount,
      itemsSold: itemTotals.itemsSold,
    },
    daily: dailyAgg,
    byCashier: cashierAgg,
    byCategory: (itemFacets[0] && itemFacets[0].byCategory) || [],
    topProducts: (itemFacets[0] && itemFacets[0].topProducts) || [],
  });
});

module.exports = router;
