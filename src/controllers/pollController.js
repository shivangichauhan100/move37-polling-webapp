const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new poll
const createPoll = async (req, res) => {
  try {
    const { question, options, creatorId } = req.body;

    // Validate input
    if (!question || !options || !Array.isArray(options) || options.length < 2 || !creatorId) {
      return res.status(400).json({ 
        error: 'Question, at least two options, and creatorId are required' 
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: creatorId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create poll with options
    const poll = await prisma.poll.create({
      data: {
        question,
        creatorId,
        options: {
          create: options.map(option => ({ text: option }))
        }
      },
      include: {
        options: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(poll);
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all polls
const getPolls = async (req, res) => {
  try {
    const polls = await prisma.poll.findMany({
      include: {
        options: {
          include: {
            votes: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format response to include vote counts
    const pollsWithVoteCounts = polls.map(poll => ({
      ...poll,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option.votes.length
      }))
    }));

    res.json(pollsWithVoteCounts);
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get poll by ID
const getPollById = async (req, res) => {
  try {
    const { id } = req.params;

    const poll = await prisma.poll.findUnique({
      where: { id },
      include: {
        options: {
          include: {
            votes: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Format response to include vote counts
    const pollWithVoteCounts = {
      ...poll,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option.votes.length
      }))
    };

    res.json(pollWithVoteCounts);
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Publish a poll
const publishPoll = async (req, res) => {
  try {
    const { id } = req.params;

    const poll = await prisma.poll.update({
      where: { id },
      data: {
        isPublished: true
      },
      include: {
        options: {
          include: {
            votes: true
          }
        }
      }
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Format response to include vote counts
    const pollWithVoteCounts = {
      ...poll,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option.votes.length
      }))
    };

    res.json(pollWithVoteCounts);
  } catch (error) {
    console.error('Error publishing poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createPoll,
  getPolls,
  getPollById,
  publishPoll
};