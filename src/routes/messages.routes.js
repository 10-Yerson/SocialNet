const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/authMiddleware');
const messageController = require("../controllers/messageController");

router.post('/', auth, authorize('user'),  messageController.sendMessage);
router.get('/:userId', auth, authorize('user'),  messageController.getMessages);
router.put('/seen/:id', auth, authorize('user'),  messageController.markAsSeen);
router.delete('/:id', auth, authorize('user'),  messageController.deleteMessage);

module.exports = router;    