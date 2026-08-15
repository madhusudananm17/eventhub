const mongoose = require('mongoose');
const Review = require('../models/Review');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Registration = require('../models/Registration');

// @desc    Add a review for an event (Restricted to registered attendees)
// @route   POST /api/events/:id/reviews
// @access  Private (User)
const addReview = async (req, res) => {
    try {
        const eventId = req.params.id;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid rating between 1 and 5 stars.'
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }

        // Check if user has registered / attended the event
        const hasRegistration = await Registration.findOne({
            event: eventId,
            user: req.user._id,
            status: { $ne: 'cancelled' }
        });

        const hasBooking = await Booking.findOne({
            event: eventId,
            user: req.user._id,
            bookingStatus: 'CONFIRMED'
        });

        if (!hasRegistration && !hasBooking) {
            return res.status(403).json({
                success: false,
                message: 'Only registered users can review this event.'
            });
        }

        // Check for duplicate review by same user for same event
        const existingReview = await Review.findOne({
            event: eventId,
            user: req.user._id
        });

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted a review for this event.'
            });
        }

        const review = await Review.create({
            event: eventId,
            user: req.user._id,
            rating: Number(rating),
            comment: (comment || '').trim()
        });

        // Calculate average rating
        const allReviews = await Review.find({ event: eventId });
        const totalReviews = allReviews.length;
        const sumRatings = allReviews.reduce((acc, item) => acc + item.rating, 0);
        const averageRating = totalReviews > 0 ? parseFloat((sumRatings / totalReviews).toFixed(1)) : 0;

        const populatedReview = await Review.findById(review._id).populate('user', 'name');

        return res.status(201).json({
            success: true,
            message: 'Review submitted successfully.',
            review: populatedReview,
            averageRating,
            totalReviews
        });
    } catch (error) {
        console.error('AddReview Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get all reviews and rating statistics for an event
// @route   GET /api/events/:id/reviews
// @access  Public
const getEventReviews = async (req, res) => {
    try {
        const eventId = req.params.id;

        const reviews = await Review.find({ event: eventId })
            .populate('user', 'name')
            .sort({ createdAt: -1 });

        const totalReviews = reviews.length;
        const sumRatings = reviews.reduce((acc, item) => acc + item.rating, 0);
        const averageRating = totalReviews > 0 ? parseFloat((sumRatings / totalReviews).toFixed(1)) : 0;

        return res.json({
            success: true,
            count: reviews.length,
            averageRating,
            totalReviews,
            reviews
        });
    } catch (error) {
        console.error('GetEventReviews Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

module.exports = {
    addReview,
    getEventReviews
};
