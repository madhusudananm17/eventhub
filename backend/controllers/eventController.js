const Event = require('../models/Event');
const Registration = require('../models/Registration');

// Category icons mapping helper
const getCategoryIcon = (category) => {
    switch (category ? category.toLowerCase() : '') {
        case 'technology': return '💻';
        case 'education': return '🎓';
        case 'music': return '🎵';
        case 'sports': return '⚽';
        case 'business': return '💼';
        case 'cultural': return '🎨';
        case 'entertainment': return '🎬';
        default: return '🎫';
    }
};

// Category default image helper
const getDefaultImageForCategory = (category) => {
    switch (category ? category.toLowerCase() : '') {
        case 'technology': return 'images/tech-event.jpg';
        case 'sports': return 'images/sports-event.jpg';
        case 'music': return 'images/music-event.jpg';
        case 'business': return 'images/business-event.jpg';
        case 'cultural': return 'images/cultural-event.jpg';
        case 'education': return 'images/education-event.jpg';
        case 'entertainment': return 'images/entertainment-event.jpg';
        default: return 'images/tech-event.jpg';
    }
};

// @desc    Get all events (public, with filter support)
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res) => {
    try {
        const { search, category, location, price, sort } = req.query;

        let query = {};

        // Search query
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        // Category filter
        if (category && category !== 'all') {
            query.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }

        // Location filter
        if (location && location !== 'all') {
            query.location = { $regex: new RegExp(`^${location}$`, 'i') };
        }

        // Price filter
        if (price) {
            if (price === 'free') {
                query.price = 0;
            } else if (price === 'under500') {
                query.price = { $gt: 0, $lt: 500 };
            } else if (price === 'above500') {
                query.price = { $gt: 500 };
            }
        }

        let eventsQuery = Event.find(query).populate('organizer', 'name email phone');

        // Sorting
        if (sort === 'low') {
            eventsQuery = eventsQuery.sort({ price: 1 });
        } else if (sort === 'high') {
            eventsQuery = eventsQuery.sort({ price: -1 });
        } else {
            eventsQuery = eventsQuery.sort({ createdAt: -1 });
        }

        const events = await eventsQuery;

        return res.json({
            success: true,
            count: events.length,
            events
        });
    } catch (error) {
        console.error('GetEvents Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('organizer', 'name email phone');

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        return res.json({
            success: true,
            event
        });
    } catch (error) {
        console.error('GetEventById Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Invalid event ID or server error'
        });
    }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Organizer / Admin)
const createEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            date,
            time,
            location,
            venue,
            price,
            capacity,
            icon,
            image
        } = req.body;

        if (!title || !description || !category || !date || !time || !location || !venue || !capacity) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        const eventPrice = Number(price) || 0;
        const eventCapacity = Number(capacity);

        const newEvent = new Event({
            title,
            description,
            category,
            date,
            time,
            location,
            venue,
            price: eventPrice,
            icon: icon || getCategoryIcon(category),
            image: image || getDefaultImageForCategory(category),
            capacity: eventCapacity,
            availableSeats: eventCapacity,
            organizer: req.user._id
        });

        const createdEvent = await newEvent.save();

        return res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event: createdEvent
        });
    } catch (error) {
        console.error('CreateEvent Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer owner / Admin)
const updateEvent = async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check ownership (must be organizer owner or admin)
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this event'
            });
        }

        const {
            title,
            description,
            category,
            date,
            time,
            location,
            venue,
            price,
            capacity,
            icon,
            image
        } = req.body;

        if (title) event.title = title;
        if (description) event.description = description;
        if (category) {
            event.category = category;
            if (!icon) event.icon = getCategoryIcon(category);
        }
        if (date) event.date = date;
        if (time) event.time = time;
        if (location) event.location = location;
        if (venue) event.venue = venue;
        if (price !== undefined) event.price = Number(price);
        if (icon) event.icon = icon;
        if (image !== undefined) event.image = image;

        if (capacity !== undefined) {
            const newCapacity = Number(capacity);
            const registeredCount = event.capacity - event.availableSeats;
            event.capacity = newCapacity;
            event.availableSeats = Math.max(0, newCapacity - registeredCount);
        }

        const updatedEvent = await event.save();

        return res.json({
            success: true,
            message: 'Event updated successfully',
            event: updatedEvent
        });
    } catch (error) {
        console.error('UpdateEvent Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organizer owner / Admin)
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check ownership
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this event'
            });
        }

        // Delete associated registrations
        await Registration.deleteMany({ event: event._id });
        await event.deleteOne();

        return res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('DeleteEvent Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get organizer's created events
// @route   GET /api/organizer/events
// @access  Private (Organizer / Admin)
const getOrganizerEvents = async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: events.length,
            events
        });
    } catch (error) {
        console.error('GetOrganizerEvents Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

module.exports = {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    getOrganizerEvents
};
