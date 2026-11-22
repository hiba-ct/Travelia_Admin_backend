
const TouristPlace = require('../models/touristPlaceModel');

// GET all tourist places
exports.getTouristPlaces = async (req, res, next) => {
  try {
    const { search, category, status } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } }
      ];
    }

    const places = await TouristPlace.find(filter)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: places.length,
      data: places
    });
  } catch (error) {
    next(error);
  }
};

// GET single tourist place
exports.getTouristPlaceById = async (req, res, next) => {
  try {
    const place = await TouristPlace.findById(req.params.id);

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Tourist place not found'
      });
    }

    res.status(200).json({
      success: true,
      data: place
    });
  } catch (error) {
    next(error);
  }
};

// CREATE tourist place
exports.createTouristPlace = async (req, res, next) => {
  try {
    const place = await TouristPlace.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Tourist place added successfully',
      data: place
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE tourist place
exports.updateTouristPlace = async (req, res, next) => {
  try {
    const place = await TouristPlace.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Tourist place not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tourist place updated successfully',
      data: place
    });
  } catch (error) {
    next(error);
  }
};

// DELETE tourist place
exports.deleteTouristPlace = async (req, res, next) => {
  try {
    const place = await TouristPlace.findByIdAndDelete(
      req.params.id
    );

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Tourist place not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tourist place deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
