const express = require('express');
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
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
  const { search, status, paymentStatus, from, to, page = 1, limit = 20 } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { invoiceNumber: new RegExp(search, 'i') },
      { customerName: new RegExp(search, 'i') },
      { customerPhone: new RegExp(search, 'i') },
    ];
  }
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  if (req.query.export === 'true') {
    const items = await Sale.find(query).sort({ createdAt: -1 }).limit(5000);
    return res.json({ items, total: items.length, page: 1, pages: 1 });
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    Sale.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Sale.countDocuments(query),
  ]);

  res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

router.get('/:id', async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Invoice not found' });
  res.json(sale);
});

router.post('/', authorize('admin', 'manager', 'cashier'), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const {
        customer,
        customerName,
        customerPhone,
        items,
        discount = 0,
        discountType = 'flat',
        taxRate = 0,
        shipping = 0,
        amountPaid,
        paymentMethod = 'cash',
        notes,
      } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('At least one item is required');
      }

      const settings = await getSettings();
      const saleItems = [];
      let subtotal = 0;

      for (const line of items) {
        const product = await Product.findById(line.product).session(session);
        if (!product) throw new Error(`Product not found: ${line.name || line.product}`);
        const qty = Number(line.quantity) || 0;
        if (qty <= 0) throw new Error(`Invalid quantity for ${product.name}`);
        if (product.stock < qty) throw new Error(`Insufficient stock for ${product.name} (available: ${product.stock})`);

        const price = line.price !== undefined ? Number(line.price) : product.sellPrice;
        const lineTotal = price * qty;
        subtotal += lineTotal;

        product.stock -= qty;
        await product.save({ session });

        saleItems.push({
          product: product._id,
          name: product.name,
          sku: product.sku,
          price,
          quantity: qty,
          total: lineTotal,
        });
      }

      const discountAmount = discountType === 'percent' ? (subtotal * Number(discount || 0)) / 100 : Number(discount || 0);
      const taxable = Math.max(0, subtotal - discountAmount);
      const taxAmount = (taxable * Number(taxRate || 0)) / 100;
      const total = Math.max(0, taxable + taxAmount + Number(shipping || 0));
      const paid = amountPaid !== undefined && amountPaid !== null ? Number(amountPaid) : total;
      const due = Math.max(0, total - paid);
      const paymentStatus = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'due';

      const seq = await Counter.nextSequence('invoice');
      const invoiceNumber = `${settings.invoicePrefix || 'INV-'}${String(seq).padStart(5, '0')}`;

      let customerDoc = null;
      if (customer) {
        customerDoc = await Customer.findById(customer).session(session);
        if (customerDoc) {
          customerDoc.totalPurchases += 1;
          customerDoc.totalSpent += total;
          await customerDoc.save({ session });
        }
      }

      const [sale] = await Sale.create(
        [
          {
            invoiceNumber,
            customer: customerDoc ? customerDoc._id : null,
            customerName: customerDoc ? customerDoc.name : customerName || 'Walk-in Customer',
            customerPhone: customerDoc ? customerDoc.phone : customerPhone || '',
            items: saleItems,
            subtotal,
            discount: discountAmount,
            discountType,
            tax: taxAmount,
            taxRate,
            shipping,
            total,
            amountPaid: paid,
            dueAmount: due,
            paymentMethod,
            paymentStatus,
            cashier: req.user._id,
            cashierName: req.user.name,
            notes,
          },
        ],
        { session }
      );

      result = sale;
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

router.patch('/:id/payment', authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { amountPaid } = req.body;
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Invoice not found' });
    const paid = Number(amountPaid);
    if (Number.isNaN(paid) || paid < 0) return res.status(400).json({ message: 'Invalid amount' });
    sale.amountPaid = paid;
    sale.dueAmount = Math.max(0, sale.total - paid);
    sale.paymentStatus = sale.dueAmount <= 0 ? 'paid' : paid > 0 ? 'partial' : 'due';
    await sale.save();
    res.json(sale);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id/void', authorize('admin', 'manager'), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const sale = await Sale.findById(req.params.id).session(session);
      if (!sale) throw new Error('Invoice not found');
      if (sale.status === 'cancelled') throw new Error('Invoice already cancelled');

      for (const item of sale.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }, { session });
        }
      }
      sale.status = 'cancelled';
      await sale.save({ session });
      result = sale;
    });
    logActivity({ action: 'sale_void', entityType: 'sale', entityLabel: result.invoiceNumber, user: req.user });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

router.post('/:id/refund', authorize('admin', 'manager'), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const sale = await Sale.findById(req.params.id).session(session);
      if (!sale) throw new Error('Invoice not found');
      if (sale.status === 'cancelled') throw new Error('Cannot refund a voided invoice');
      if (sale.status === 'refunded') throw new Error('Invoice is already fully refunded');

      const { lines, reason } = req.body;
      if (!Array.isArray(lines) || lines.length === 0) {
        throw new Error('Select at least one item to refund');
      }

      const refundItems = [];
      let amount = 0;

      for (const line of lines) {
        const idx = Number(line.index);
        const qty = Number(line.quantity);
        const item = sale.items[idx];
        if (!item) throw new Error('Invalid line item');
        if (!qty || qty <= 0) continue;
        const alreadyRefunded = item.refundedQuantity || 0;
        const available = item.quantity - alreadyRefunded;
        if (qty > available) throw new Error(`Cannot refund more than ${available} of "${item.name}"`);

        item.refundedQuantity = alreadyRefunded + qty;
        const lineTotal = item.price * qty;
        amount += lineTotal;

        refundItems.push({
          product: item.product,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: qty,
          total: lineTotal,
        });

        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: qty } }, { session });
        }
      }

      if (refundItems.length === 0) throw new Error('Select at least one item to refund');

      sale.refundedAmount = (sale.refundedAmount || 0) + amount;
      sale.refunds.push({
        items: refundItems,
        amount,
        reason: reason || '',
        refundedBy: req.user._id,
        refundedByName: req.user.name,
        createdAt: new Date(),
      });

      const fullyRefunded = sale.items.every((it) => (it.refundedQuantity || 0) >= it.quantity);
      if (fullyRefunded) sale.status = 'refunded';

      await sale.save({ session });

      if (sale.customer) {
        await Customer.findByIdAndUpdate(sale.customer, { $inc: { totalSpent: -amount } }, { session });
      }

      result = sale;
    });
    logActivity({
      action: 'sale_refund',
      entityType: 'sale',
      entityLabel: result.invoiceNumber,
      details: `${result.refunds[result.refunds.length - 1].amount.toFixed(2)} refunded`,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let deletedId;
    let deletedInvoiceNumber;
    await session.withTransaction(async () => {
      const sale = await Sale.findById(req.params.id).session(session);
      if (!sale) throw new Error('Invoice not found');
      deletedInvoiceNumber = sale.invoiceNumber;

      // Only restore stock / customer totals if the sale was still active —
      // a voided sale already had its stock restored when it was cancelled.
      if (sale.status !== 'cancelled') {
        for (const item of sale.items) {
          if (item.product) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }, { session });
          }
        }
        if (sale.customer) {
          await Customer.findByIdAndUpdate(
            sale.customer,
            { $inc: { totalPurchases: -1, totalSpent: -sale.total } },
            { session }
          );
        }
      }

      await sale.deleteOne({ session });
      deletedId = sale._id;
    });
    res.json({ message: 'Invoice deleted', _id: deletedId });
    logActivity({ action: 'sale_delete', entityType: 'sale', entityLabel: deletedInvoiceNumber, user: req.user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

router.get('/:id/pdf', async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Invoice not found' });
  const settings = await getSettings();
  const symbol = settings.currencySymbol || '$';

  const doc = newDocument();
  streamPdf(res, doc, `${sale.invoiceNumber}.pdf`);

  drawBrandHeader(doc, settings, 'INVOICE', `#${sale.invoiceNumber}`);

  labelValue(doc, 50, 130, 'Billed To', sale.customerName, { bold: true });
  if (sale.customerPhone) labelValue(doc, 50, 170, 'Phone', sale.customerPhone);
  labelValue(doc, 330, 130, 'Invoice Date', new Date(sale.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  }));
  labelValue(doc, 330, 170, 'Payment Status', sale.paymentStatus.toUpperCase());
  labelValue(doc, 440, 170, 'Method', (sale.paymentMethod || '').replace('-', ' '));

  let y = 220;
  const columns = [
    { label: 'Item', x: 0, width: 210 },
    { label: 'Price', x: 215, width: 70, align: 'right' },
    { label: 'Qty', x: 290, width: 50, align: 'right' },
    { label: 'Total', x: 425, width: 70, align: 'right' },
  ];
  drawTableHeader(doc, 50, y, columns);
  y += 26;

  sale.items.forEach((item) => {
    if (y > 700) {
      doc.addPage();
      y = 60;
      drawTableHeader(doc, 50, y, columns);
      y += 26;
    }
    drawTableRow(doc, 50, y, columns, [item.name, money(item.price, symbol), item.quantity, money(item.total, symbol)]);
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

  summaryRow('Subtotal', money(sale.subtotal, symbol));
  if (sale.discount > 0) summaryRow('Discount', `-${money(sale.discount, symbol)}`);
  if (sale.tax > 0) summaryRow(`Tax (${sale.taxRate}%)`, money(sale.tax, symbol));
  if (sale.shipping > 0) summaryRow('Shipping', money(sale.shipping, symbol));
  summaryRow('Total', money(sale.total, symbol), { bold: true, size: 13 });
  summaryRow('Amount Paid', money(sale.amountPaid, symbol));
  if (sale.dueAmount > 0) summaryRow('Balance Due', money(sale.dueAmount, symbol), { color: '#d6473f', bold: true });

  if (sale.notes) {
    y += 16;
    doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text('Notes', 50, y);
    doc.fillColor('#1a2028').font('Helvetica').fontSize(10).text(sale.notes, 50, y + 13, { width: 495 });
  }

  drawFooter(doc, `Thank you for your business — ${settings.storeName || 'My Store'}`);
  doc.end();
});

module.exports = router;
