const express = require('express');
const router = express.Router({ mergeParams: true });
const { addReview, getEventReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(getEventReviews)
    .post(protect, addReview);

module.exports = router;
