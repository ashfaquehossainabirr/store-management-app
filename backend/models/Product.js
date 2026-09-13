const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, unique: true, uppercase: true },
    barcode: { type: String, trim: true, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    unit: { type: String, default: 'pcs' },
    costPrice: { type: Number, required: true, min: 0, default: 0 },
    sellPrice: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 5 },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', sku: 'text', barcode: 'text' });

module.exports = mongoose.model('Product', productSchema);
