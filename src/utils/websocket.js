const WebSocket = require('ws');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const wss = new WebSocket.Server({ noServer: true });

// Map to track which clients are watching which polls
const pollSubscriptions = new Map();

function setupWebSocketServer(server) {
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'subscribe') {
          const { pollId } = data;
          
          // Add client to poll subscription
          if (!pollSubscriptions.has(pollId)) {
            pollSubscriptions.set(pollId, new Set());
          }
          pollSubscriptions.get(pollId).add(ws);
          
          // Send current poll data
          const poll = await prisma.poll.findUnique({
            where: { id: pollId },
            include: {
              options: {
                include: {
                  votes: true
                }
              }
            }
          });
          
          if (poll) {
            const pollData = {
              type: 'poll_data',
              poll: {
                ...poll,
                options: poll.options.map(option => ({
                  id: option.id,
                  text: option.text,
                  voteCount: option.votes.length
                }))
              }
            };
            ws.send(JSON.stringify(pollData));
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from all subscriptions
      for (const [pollId, clients] of pollSubscriptions.entries()) {
        if (clients.has(ws)) {
          clients.delete(ws);
          if (clients.size === 0) {
            pollSubscriptions.delete(pollId);
          }
        }
      }
    });
  });
}

// Function to broadcast vote updates to all subscribers of a poll
async function broadcastPollUpdate(pollId) {
  const subscribers = pollSubscriptions.get(pollId);
  if (!subscribers || subscribers.size === 0) return;

  try {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            votes: true
          }
        }
      }
    });

    if (poll) {
      const pollData = {
        type: 'poll_update',
        poll: {
          ...poll,
          options: poll.options.map(option => ({
            id: option.id,
            text: option.text,
            voteCount: option.votes.length
          }))
        }
      };

      const message = JSON.stringify(pollData);
      
      subscribers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  } catch (error) {
    console.error('Error broadcasting poll update:', error);
  }
}

module.exports = { setupWebSocketServer, broadcastPollUpdate };