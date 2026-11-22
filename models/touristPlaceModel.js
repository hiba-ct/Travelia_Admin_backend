
const mongoose = require('mongoose');

const touristPlaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    city: {
      type: String,
      required: true,
      trim: true
    },

    country: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true
    },

    image: {
      type: String,
      required: true
    },

    category: {
      type: String,
      enum: [
        'Beach',
        'Nature',
        'Adventure',
        'Historical',
        'City',
        'Other'
      ],
      default: 'Other'
    },

    bestTimeToVisit: {
      type: String,
      default: ''
    },

    entryFee: {
      type: Number,
      default: 0,
      min: 0
    },

    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  'TouristPlace',
  touristPlaceSchema
);

