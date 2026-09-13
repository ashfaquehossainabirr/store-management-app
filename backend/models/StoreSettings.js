const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: 'My Store' },
    storeType: { type: String, default: 'General Store' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    currency: { type: String, default: 'USD' },
    currencySymbol: { type: String, default: '$' },
    taxRate: { type: Number, default: 0 },
    invoicePrefix: { type: String, default: 'INV-' },
    lowStockThreshold: { type: Number, default: 5 },
    logo: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
