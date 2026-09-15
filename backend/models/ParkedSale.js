const mongoose = require('mongoose');

const parkedLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    sku: { type: String, default: '' },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const parkedSaleSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    items: { type: [parkedLineSchema], default: [] },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, default: '' },
    parkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    parkedByName: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ParkedSale', parkedSaleSchema);
