const express = require('express');
const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Counter = require('../models/Counter');
const StoreSettings = require('../models/StoreSettings');
const logActivity = require('../utils/logActivity');
const { protect, authorize } = require('../middleware/auth');
const {
  newDocument,
  streamPdf,
  drawBrandHeader,
  labelValue,
  drawTableHeader,
  drawTableRow,
  drawFooter,
  money,
} = require('../utils/pdf');

const router = express.Router();
router.use(protect);

async function getSettings() {
  let settings = await StoreSettings.findOne();
  if (!settings) settings = await StoreSettings.create({});
  return settings;
}

router.get('/', async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (search) query.$or = [{ poNumber: new RegExp(search, 'i') }, { supplierName: new RegExp(search, 'i') }];

  if (req.query.export === 'true') {
    const items = await Purchase.find(query).sort({ createdAt: -1 }).limit(5000);
    return res.json({ items, total: items.length, page: 1, pages: 1 });
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    Purchase.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Purchase.countDocuments(query),
  ]);
  res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

router.get('/:id', async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return res.status(404).json({ message: 'Purchase order not found' });
  res.json(purchase);
});

router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { supplier, items, shipping = 0, notes } = req.body;
    if (!supplier) return res.status(400).json({ message: 'Supplier is required' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }
    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) return res.status(404).json({ message: 'Supplier not found' });

    let subtotal = 0;
    const purchaseItems = items.map((line) => {
      const qty = Number(line.quantity) || 0;
      const cost = Number(line.cost) || 0;
      const total = qty * cost;
      subtotal += total;
      return { product: line.product, name: line.name, sku: line.sku || '', cost, quantity: qty, total };
    });

    const seq = await Counter.nextSequence('purchase');
    const poNumber = `PO-${String(seq).padStart(5, '0')}`;

    const purchase = await Purchase.create({
      poNumber,
      supplier: supplierDoc._id,
      supplierName: supplierDoc.name,
      items: purchaseItems,
      subtotal,
      shipping,
      total: subtotal + Number(shipping || 0),
      createdBy: req.user._id,
      notes,
    });

    res.status(201).json(purchase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase order not found' });
    if (purchase.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending purchase orders can be edited' });
    }

    const { supplier, items, shipping = 0, notes } = req.body;
    if (!supplier) return res.status(400).json({ message: 'Supplier is required' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }
    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) return res.status(404).json({ message: 'Supplier not found' });

    let subtotal = 0;
    const purchaseItems = items.map((line) => {
      const qty = Number(line.quantity) || 0;
      const cost = Number(line.cost) || 0;
      const total = qty * cost;
      subtotal += total;
      return { product: line.product, name: line.name, sku: line.sku || '', cost, quantity: qty, total };
    });

    purchase.supplier = supplierDoc._id;
    purchase.supplierName = supplierDoc.name;
    purchase.items = purchaseItems;
    purchase.subtotal = subtotal;
    purchase.shipping = Number(shipping) || 0;
    purchase.total = subtotal + (Number(shipping) || 0);
    if (notes !== undefined) purchase.notes = notes;

    await purchase.save();
    res.json(purchase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let deletedId;
    let deletedPoNumber;
    await session.withTransaction(async () => {
      const purchase = await Purchase.findById(req.params.id).session(session);
      if (!purchase) throw new Error('Purchase order not found');
      deletedPoNumber = purchase.poNumber;

      // If the order was already received, reverse the stock it added before removing it.
      if (purchase.status === 'received') {
        for (const item of purchase.items) {
          if (item.product) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } }, { session });
          }
        }
      }

      await purchase.deleteOne({ session });
      deletedId = purchase._id;
    });
    res.json({ message: 'Purchase order deleted', _id: deletedId });
    logActivity({ action: 'purchase_delete', entityType: 'purchase', entityLabel: deletedPoNumber, user: req.user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

router.patch('/:id/receive', authorize('admin', 'manager'), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const purchase = await Purchase.findById(req.params.id).session(session);
      if (!purchase) throw new Error('Purchase order not found');
      if (purchase.status === 'received') throw new Error('Already received');
      if (purchase.status === 'cancelled') throw new Error('Cannot receive a cancelled order');

      for (const item of purchase.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity }, $set: { costPrice: item.cost } },
            { session }
          );
        }
      }
      purchase.status = 'received';
      purchase.receivedAt = new Date();
      await purchase.save({ session });
      result = purchase;
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

router.patch('/:id/cancel', authorize('admin', 'manager'), async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return res.status(404).json({ message: 'Purchase order not found' });
  if (purchase.status === 'received') return res.status(400).json({ message: 'Cannot cancel a received order' });
  purchase.status = 'cancelled';
  await purchase.save();
  logActivity({ action: 'purchase_cancel', entityType: 'purchase', entityLabel: purchase.poNumber, user: req.user });
  res.json(purchase);
});

router.get('/:id/pdf', async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return res.status(404).json({ message: 'Purchase order not found' });
  const settings = await getSettings();
  const symbol = settings.currencySymbol || '$';

  const doc = newDocument();
  streamPdf(res, doc, `${purchase.poNumber}.pdf`);

  drawBrandHeader(doc, settings, 'PURCHASE ORDER', `#${purchase.poNumber}`);

  labelValue(doc, 50, 130, 'Supplier', purchase.supplierName, { bold: true });
  labelValue(doc, 330, 130, 'Order Date', new Date(purchase.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  }));
  labelValue(doc, 330, 170, 'Status', purchase.status.toUpperCase());
  if (purchase.receivedAt) {
    labelValue(doc, 440, 170, 'Received', new Date(purchase.receivedAt).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    }));
  }

  let y = 220;
  const columns = [
    { label: 'Item', x: 0, width: 190 },
    { label: 'SKU', x: 195, width: 90 },
    { label: 'Cost', x: 290, width: 60, align: 'right' },
    { label: 'Qty', x: 355, width: 45, align: 'right' },
    { label: 'Total', x: 425, width: 70, align: 'right' },
  ];
  drawTableHeader(doc, 50, y, columns);
  y += 26;

  purchase.items.forEach((item) => {
    if (y > 700) {
      doc.addPage();
      y = 60;
      drawTableHeader(doc, 50, y, columns);
      y += 26;
    }
    drawTableRow(doc, 50, y, columns, [item.name, item.sku || '—', money(item.cost, symbol), item.quantity, money(item.total, symbol)]);
    y += 22;
  });

  y += 10;
  doc.moveTo(330, y).lineTo(545, y).strokeColor('#e2e5ea').lineWidth(1).stroke();
  y += 14;

  const summaryRow = (label, value, opts = {}) => {
    doc.fillColor(opts.color || '#1a2028').font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10.5);
    doc.text(label, 330, y, { width: 130 });
    doc.text(value, 425, y, { width: 120, align: 'right' });
    y += 20;
  };

  summaryRow('Subtotal', money(purchase.subtotal, symbol));
  if (purchase.shipping > 0) summaryRow('Shipping', money(purchase.shipping, symbol));
  summaryRow('Total', money(purchase.total, symbol), { bold: true, size: 13 });

  if (purchase.notes) {
    y += 16;
    doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text('Notes', 50, y);
    doc.fillColor('#1a2028').font('Helvetica').fontSize(10).text(purchase.notes, 50, y + 13, { width: 495 });
  }

  drawFooter(doc, `${settings.storeName || 'My Store'} — Purchase Order`);
  doc.end();
});

module.exports = router;
