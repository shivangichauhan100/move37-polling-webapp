const express = require('express');
const { submitVote, getVotesByPoll } = require('../controllers/voteController');

const router = express.Router();

router.post('/', submitVote);
router.get('/poll/:pollId', getVotesByPoll);

module.exports = router;