import express, { Request, Response } from "express";
import http from "http";
import WebSocket from "ws";
const cors = require('cors')

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Define a type for clients in a room
interface Client {
  id: string;
  username: string;
  ws: WebSocket;
}

// Room storage (maps room IDs to sets of clients)
const rooms: Map<string, Set<Client>> = new Map();

// Helper function to broadcast messages to all clients in a room
function broadcastToRoom(roomId: string, message: object): void {
  const clients = rooms.get(roomId);
  if (!clients) return;

  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

// Get a list of active users in a room
function getActiveUsers(roomId: string): { username: string; id: string }[] {
  const clients = rooms.get(roomId);
  if (!clients) return [];

  return Array.from(clients).map((client) => ({
    username: client.username,
    id: client.id,
  }));
}

// Handle WebSocket connections
wss.on("connection", (ws: WebSocket) => {
  let userId: string | null = null;
  let currentRoom: string | null = null;
  let username: string | null = null;

  ws.on("message", (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "join":
          userId = Date.now().toString();
          currentRoom = message.roomId;
          username = message.username;

          // Ensure currentRoom is not null before using it
          if (currentRoom) {
            if (!rooms.has(currentRoom)) {
              rooms.set(currentRoom, new Set());
            }

            // Get the clients set for this room and add the new client
            const roomClients = rooms.get(currentRoom);
            if (roomClients && userId && username) {
              roomClients.add({ id: userId, username, ws });
            }

            ws.send(
              JSON.stringify({
                type: "joined",
                userId,
                roomId: currentRoom,
                timestamp: new Date().toISOString(),
              })
            );

            broadcastToRoom(currentRoom, {
              type: "user-joined",
              username,
              timestamp: new Date().toISOString(),
              users: getActiveUsers(currentRoom),
            });
          } else {
            // Handle case where currentRoom is null
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Room ID is required",
              })
            );
          }
          break;

        case "message":
          if (!currentRoom || !userId || !username) return;

          broadcastToRoom(currentRoom, {
            type: "message",
            content: message.content,
            username,
            userId,
            timestamp: new Date().toISOString(),
          });
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to process your message",
        })
      );
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const roomClients = rooms.get(currentRoom);

      if (roomClients && userId) {
        // Find and remove the client from the room
        for (const client of roomClients) {
          if (client.id === userId) {
            roomClients.delete(client);
            break;
          }
        }

        if (roomClients.size === 0) {
          rooms.delete(currentRoom);
        } else {
          broadcastToRoom(currentRoom, {
            type: "user-left",
            username,
            timestamp: new Date().toISOString(),
            users: getActiveUsers(currentRoom),
          });
        }
      }
    }
  });
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("Server is running");
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
