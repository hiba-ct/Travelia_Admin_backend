const express = require('express');
const router = express.Router();

const {
  getTouristPlaces,
  getTouristPlaceById,
  createTouristPlace,
  updateTouristPlace,
  deleteTouristPlace
} = require('../controllers/touristPlaceController');

router.get('/', getTouristPlaces);
router.get('/:id', getTouristPlaceById);
router.post('/', createTouristPlace);
router.put('/:id', updateTouristPlace);
router.delete('/:id', deleteTouristPlace);

module.exports = router;