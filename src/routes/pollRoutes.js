const express = require('express');
const { createPoll, getPolls, getPollById, publishPoll } = require('../controllers/pollController');

const router = express.Router();

router.post('/', createPoll);
router.get('/', getPolls);
router.get('/:id', getPollById);
router.patch('/:id/publish', publishPoll);

module.exports = router;