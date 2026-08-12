const express = require('express');
const router = express.Router();
const { getOrganizerEvents } = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/events', protect, authorize('organizer', 'admin'), getOrganizerEvents);

module.exports = router;
