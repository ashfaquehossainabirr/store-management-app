const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    sku: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 },
    refundedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const refundLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    sku: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const refundSchema = new mongoose.Schema(
  {
    items: { type: [refundLineSchema], required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    refundedByName: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, default: 'Walk-in Customer' },
    customerPhone: { type: String, default: '' },
    items: { type: [saleItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
    tax: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, enum: ['cash', 'card', 'mobile-banking', 'bank-transfer', 'due'], default: 'cash' },
    paymentStatus: { type: String, enum: ['paid', 'partial', 'due'], default: 'paid' },
    status: { type: String, enum: ['completed', 'refunded', 'cancelled'], default: 'completed' },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cashierName: { type: String, default: '' },
    notes: { type: String, default: '' },
    refundedAmount: { type: Number, default: 0, min: 0 },
    refunds: { type: [refundSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
