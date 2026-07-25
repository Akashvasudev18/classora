import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { setupSocketHandlers } from "./sockets/socketHandler.js";
import { roomManager } from "./services/roomManager.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Setup Socket handlers
setupSocketHandlers(io);

// Health Check Endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Classora Server",
    timestamp: new Date().toISOString()
  });
});

// Rooms Debug Endpoint
app.get("/api/rooms", (_req, res) => {
  res.json({
    activeRoomCount: Object.keys(roomManager.getAllRooms()).length,
    rooms: roomManager.getAllRooms()
  });
});

httpServer.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Classora Backend Server running on http://localhost:${PORT}`);
  console.log(`⚡ Socket.IO listening on port ${PORT}`);
  console.log(`=================================`);
});
