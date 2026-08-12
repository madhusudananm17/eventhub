const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

// @desc    Get all users (role === 'user')
// @route   GET /api/users
// @access  Private (Admin)
const getUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('GetUsers Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get all organizers (role === 'organizer')
// @route   GET /api/organizers
// @access  Private (Admin)
const getOrganizers = async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer' }).select('-password').sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: organizers.length,
            organizers
        });
    } catch (error) {
        console.error('GetOrganizers Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete user's registrations
        await Registration.deleteMany({ user: user._id });
        await user.deleteOne();

        return res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('DeleteUser Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Delete an organizer
// @route   DELETE /api/organizers/:id
// @access  Private (Admin)
const deleteOrganizer = async (req, res) => {
    try {
        const organizer = await User.findById(req.params.id);

        if (!organizer) {
            return res.status(404).json({
                success: false,
                message: 'Organizer not found'
            });
        }

        // Find all events created by this organizer
        const events = await Event.find({ organizer: organizer._id });
        const eventIds = events.map(e => e._id);

        // Delete registrations for these events and delete events
        await Registration.deleteMany({ event: { $in: eventIds } });
        await Event.deleteMany({ organizer: organizer._id });
        await organizer.deleteOne();

        return res.json({
            success: true,
            message: 'Organizer and their events deleted successfully'
        });
    } catch (error) {
        console.error('DeleteOrganizer Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get all events (Admin view)
// @route   GET /api/admin/events
// @access  Private (Admin)
const getAdminEvents = async (req, res) => {
    try {
        const events = await Event.find()
            .populate('organizer', 'name email phone')
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: events.length,
            events
        });
    } catch (error) {
        console.error('GetAdminEvents Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get all registrations (Admin view)
// @route   GET /api/admin/registrations
// @access  Private (Admin)
const getAdminRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find()
            .populate('user', 'name email phone role')
            .populate({
                path: 'event',
                populate: {
                    path: 'organizer',
                    select: 'name email'
                }
            })
            .sort({ registrationDate: -1 });

        return res.json({
            success: true,
            count: registrations.length,
            registrations
        });
    } catch (error) {
        console.error('GetAdminRegistrations Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

module.exports = {
    getUsers,
    getOrganizers,
    deleteUser,
    deleteOrganizer,
    getAdminEvents,
    getAdminRegistrations
};
