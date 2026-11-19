const express = require('express');
const { getTravels, getTravel, createTravel, updateTravel, deleteTravel } = require('../controllers/travelController');
const router = express.Router();

router.route('/').get(getTravels).post(createTravel);
router.route('/:id').get(getTravel).put(updateTravel).delete(deleteTravel);

module.exports = router;
