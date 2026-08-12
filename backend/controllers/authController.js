const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user or organizer
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // Input validation
        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        if (role && role.toLowerCase() === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Public registration as admin is not allowed'
            });
        }

        // Default role to 'user' if not specified
        let userRole = (role && ['user', 'organizer'].includes(role.toLowerCase()))
            ? role.toLowerCase()
            : 'user';

        // Check if user exists
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            phone,
            password,
            role: userRole
        });

        if (user) {
            const token = generateToken(user._id, user.role);
            return res.status(201).json({
                success: true,
                message: 'Registration successful',
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role
                }
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid user data'
            });
        }
    } catch (error) {
        console.error('Register Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check for user
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Validate role if specified by frontend login form
        if (role && role.toLowerCase() !== user.role) {
            return res.status(403).json({
                success: false,
                message: `Account found, but role mismatch. Account role is '${user.role}'`
            });
        }

        const token = generateToken(user._id, user.role);

        return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        return res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('GetMe Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe
};
