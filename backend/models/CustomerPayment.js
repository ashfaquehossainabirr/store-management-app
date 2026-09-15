const mongoose = require('mongoose');

const appliedToSchema = new mongoose.Schema(
  {
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    invoiceNumber: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const customerPaymentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: '' },
    appliedTo: { type: [appliedToSchema], default: [] },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedByName: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomerPayment', customerPaymentSchema);
