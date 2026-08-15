const express = require('express');
const router = express.Router();
const {
    getMyTickets,
    getTicketById,
    verifyTicketByCode,
    verifyTicket,
    markTicketUsed,
    getTicketPdf
} = require('../controllers/ticketController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/my', protect, getMyTickets);
router.get('/verify/:ticketCode', verifyTicketByCode);
router.post('/verify', protect, authorize('organizer', 'admin'), verifyTicket);
router.post('/mark-used', protect, authorize('organizer', 'admin'), markTicketUsed);
router.get('/:id/pdf', protect, getTicketPdf);
router.get('/:id', protect, getTicketById);

module.exports = router;
