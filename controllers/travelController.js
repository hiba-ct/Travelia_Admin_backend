const mongoose = require('mongoose');
const Travel = require('../models/Travel');

exports.getTravels = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && ['Active', 'Inactive'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.search) {
      const safe = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = ['title', 'destination', 'country', 'category'].map(key => ({ [key]: { $regex: safe, $options: 'i' } }));
    }
    const travels = await Travel.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: travels.length, travels });
  } catch (error) { next(error); }
};

exports.getTravel = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid travel package ID.' });
    const travel = await Travel.findById(req.params.id);
    if (!travel) return res.status(404).json({ message: 'Travel package not found.' });
    res.json({ success: true, travel });
  } catch (error) { next(error); }
};

exports.createTravel = async (req, res, next) => {
  try {
    const travel = await Travel.create(req.body);
    res.status(201).json({ success: true, message: 'Travel package created.', travel });
  } catch (error) { next(error); }
};

exports.updateTravel = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid travel package ID.' });
    const travel = await Travel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!travel) return res.status(404).json({ message: 'Travel package not found.' });
    res.json({ success: true, message: 'Travel package updated.', travel });
  } catch (error) { next(error); }
};

exports.deleteTravel = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid travel package ID.' });
    const travel = await Travel.findByIdAndDelete(req.params.id);
    if (!travel) return res.status(404).json({ message: 'Travel package not found.' });
    res.json({ success: true, message: 'Travel package deleted.' });
  } catch (error) { next(error); }
};
