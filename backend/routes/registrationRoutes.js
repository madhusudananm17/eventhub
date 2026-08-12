const express = require('express');
const router = express.Router();
const {
    registerForEvent,
    getMyRegistrations,
    getEventRegistrations,
    cancelRegistration
} = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, authorize('user', 'organizer', 'admin'), registerForEvent);
router.get('/my', protect, getMyRegistrations);
router.get('/event/:eventId', protect, authorize('organizer', 'admin'), getEventRegistrations);
router.delete('/:id', protect, cancelRegistration);

module.exports = router;
