const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    sku: { type: String, default: '' },
    cost: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, default: '' },
    items: { type: [purchaseItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'received', 'cancelled'], default: 'pending' },
    receivedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Purchase', purchaseSchema);
