const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendPasswordResetEmail, sendOtpEmail } = require('../utils/sendEmail');
const { sendSmsOtp, maskEmail } = require('../utils/sendSmsOtp');

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

// @desc    Request Password Reset Link (Forgot Password)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email address.'
            });
        }

        // Generate unhashed reset token (32 bytes = 64 hex characters)
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash token to store safely in DB
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Token expires in 15 minutes
        user.resetPasswordTokenHash = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        // Construct reset URL dynamically from client origin or Vercel frontend
        let baseUrl = process.env.FRONTEND_URL || req.get('origin') || req.get('referer');
        if (!baseUrl || baseUrl.includes('onrender.com')) {
            baseUrl = 'https://eventhub-delta-wheat.vercel.app';
        }
        baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;

        // Send email strictly via Nodemailer
        const emailSent = await sendPasswordResetEmail({
            toEmail: user.email,
            userName: user.name,
            resetUrl,
            expireMins: 15
        });

        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Could not send email to your inbox. Please verify EMAIL_USER and EMAIL_PASSWORD credentials.'
            });
        }

        return res.json({
            success: true,
            message: 'Password reset link sent to your registered email.'
        });
    } catch (error) {
        console.error('ForgotPassword Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Reset Password with Token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Reset link has expired. Please request a new one.'
            });
        }

        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please enter both new password and confirmation password.'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match.'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least 8 characters.'
            });
        }

        // Hash token from request to compare against DB resetPasswordTokenHash
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordTokenHash: resetTokenHash,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Reset link has expired. Please request a new one.'
            });
        }

        // Update password (Mongoose pre-save hook will hash password with bcryptjs)
        user.password = newPassword;

        // Invalidate single-use token
        user.resetPasswordTokenHash = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        return res.json({
            success: true,
            message: 'Password reset successfully. You can now login.'
        });
    } catch (error) {
        console.error('ResetPassword Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Request Email ID Recovery OTP (Forgot Email ID)
// @route   POST /api/auth/forgot-email
// @access  Public
const forgotEmail = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || !phone.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please enter your registered mobile number.'
            });
        }

        const cleanPhone = phone.trim();

        // Search for user by phone number
        const user = await User.findOne({ phone: cleanPhone });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this registered mobile number.'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash OTP before saving to DB
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        // Store OTP hash, expiry (5 mins), and reset attempt counter
        user.recoveryOtpHash = otpHash;
        user.recoveryOtpExpires = Date.now() + 5 * 60 * 1000;
        user.recoveryOtpAttempts = 0;

        await user.save();

        // Send OTP via SMS / WhatsApp helper
        await sendSmsOtp(user.phone, otp);

        // Also send OTP to registered email address via Nodemailer
        await sendOtpEmail({ toEmail: user.email, userName: user.name, otp, expireMins: 5 });

        return res.json({
            success: true,
            message: 'OTP sent to your registered email and mobile number.',
            devOtp: otp
        });
    } catch (error) {
        console.error('ForgotEmail Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Verify OTP & Return Masked Email ID
// @route   POST /api/auth/verify-recovery-otp
// @access  Public
const verifyRecoveryOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please enter your mobile number and 6-digit OTP.'
            });
        }

        const cleanPhone = phone.trim();
        const cleanOtp = otp.trim();

        const user = await User.findOne({ phone: cleanPhone });

        if (!user || !user.recoveryOtpHash || !user.recoveryOtpExpires) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP.'
            });
        }

        // Check if OTP expired
        if (user.recoveryOtpExpires < Date.now()) {
            user.recoveryOtpHash = undefined;
            user.recoveryOtpExpires = undefined;
            user.recoveryOtpAttempts = 0;
            await user.save();

            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP.'
            });
        }

        // Check attempt count (max 5 attempts allowed)
        if (user.recoveryOtpAttempts >= 5) {
            user.recoveryOtpHash = undefined;
            user.recoveryOtpExpires = undefined;
            user.recoveryOtpAttempts = 0;
            await user.save();

            return res.status(400).json({
                success: false,
                message: 'Maximum OTP verification attempts exceeded. Please request a new OTP.'
            });
        }

        // Track attempt
        user.recoveryOtpAttempts += 1;

        // Hash provided OTP to compare
        const providedOtpHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

        if (providedOtpHash !== user.recoveryOtpHash) {
            await user.save();
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP.'
            });
        }

        // Verification successful -> Clear OTP fields from DB
        user.recoveryOtpHash = undefined;
        user.recoveryOtpExpires = undefined;
        user.recoveryOtpAttempts = 0;
        await user.save();

        const masked = maskEmail(user.email);

        return res.json({
            success: true,
            message: 'Email recovery successful.',
            maskedEmail: masked
        });
    } catch (error) {
        console.error('VerifyRecoveryOtp Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    forgotPassword,
    resetPassword,
    forgotEmail,
    verifyRecoveryOtp
};
