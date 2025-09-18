const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { broadcastPollUpdate } = require('../utils/websocket');

// Submit a vote
const submitVote = async (req, res) => {
  try {
    const { userId, pollId, pollOptionId } = req.body;

    // Validate input
    if (!userId || !pollId || !pollOptionId) {
      return res.status(400).json({ error: 'userId, pollId, and pollOptionId are required' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if poll exists
    const poll = await prisma.poll.findUnique({
      where: { id: pollId }
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Check if poll option exists and belongs to the poll
    const pollOption = await prisma.pollOption.findFirst({
      where: {
        id: pollOptionId,
        pollId: pollId
      }
    });

    if (!pollOption) {
      return res.status(404).json({ error: 'Poll option not found for this poll' });
    }

    // Check if user has already voted on this poll
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_pollId: {
          userId,
          pollId
        }
      }
    });

    if (existingVote) {
      return res.status(409).json({ error: 'User has already voted on this poll' });
    }

    // Create vote
    const vote = await prisma.vote.create({
      data: {
        userId,
        pollId,
        pollOptionId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        poll: true,
        pollOption: true
      }
    });

    // Broadcast update to all subscribers
    await broadcastPollUpdate(pollId);

    res.status(201).json(vote);
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get votes for a poll
const getVotesByPoll = async (req, res) => {
  try {
    const { pollId } = req.params;

    const votes = await prisma.vote.findMany({
      where: { pollId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        pollOption: true
      }
    });

    res.json(votes);
  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  submitVote,
  getVotesByPoll
};