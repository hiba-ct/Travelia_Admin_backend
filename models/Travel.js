const mongoose = require('mongoose');

const travelSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  duration: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['INR', 'OMR', 'USD', 'AED'], default: 'INR' },
  travellers: { type: Number, default: 1, min: 1 },
  image: { type: String, default: '' },
  category: { type: String, default: 'Adventure' },
  availableDate: { type: Date, default: null },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Travel', travelSchema);
