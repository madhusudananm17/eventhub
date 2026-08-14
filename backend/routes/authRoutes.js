const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getMe,
    forgotPassword,
    resetPassword,
    forgotEmail,
    verifyRecoveryOtp
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Standard Authentication Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// Account Recovery Routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/forgot-email', forgotEmail);
router.post('/verify-recovery-otp', verifyRecoveryOtp);

module.exports = router;
