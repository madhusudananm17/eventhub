const express = require('express');
const router = express.Router();
const {
    getUsers,
    getOrganizers,
    deleteUser,
    deleteOrganizer,
    getAdminEvents,
    getAdminRegistrations
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All user management endpoints require Admin authentication
router.use(protect, authorize('admin'));

router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);

router.get('/organizers', getOrganizers);
router.delete('/organizers/:id', deleteOrganizer);

router.get('/admin/events', getAdminEvents);
router.get('/admin/registrations', getAdminRegistrations);

module.exports = router;
