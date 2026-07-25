import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { setupSocketHandlers } from "./sockets/socketHandler.js";
import { roomManager } from "./services/roomManager.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Parse allowed origins from environment
const rawOrigins = process.env.ALLOWED_ORIGINS || "*";
const allowedOriginsList = rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);

const checkOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Allow requests with no origin (like mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);

  // If wildcard * is present, allow all
  if (allowedOriginsList.includes("*")) return callback(null, true);

  // Check exact matches or wildcard pattern matches (e.g., *.trycloudflare.com or *.vercel.app)
  const isAllowed = allowedOriginsList.some((allowed) => {
    if (allowed === origin) return true;
    if (allowed.includes("*")) {
      const regexPattern = "^" + allowed.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$";
      return new RegExp(regexPattern).test(origin);
    }
    return false;
  });

  if (isAllowed) {
    callback(null, true);
  } else {
    // Default to allowing for smooth development & tunnel access
    callback(null, true);
  }
};

app.use(
  cors({
    origin: checkOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: checkOrigin,
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Setup Socket handlers
setupSocketHandlers(io);

// Health Check Endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Classora Server",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Rooms Debug Endpoint
app.get("/api/rooms", (_req, res) => {
  res.json({
    activeRoomCount: Object.keys(roomManager.getAllRooms()).length,
    rooms: roomManager.getAllRooms(),
  });
});

httpServer.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Classora Backend Server running on port ${PORT}`);
  console.log(`⚡ Socket.IO transports: ["websocket", "polling"]`);
  console.log(`🔒 Allowed Origins: ${rawOrigins}`);
  console.log(`=================================`);
});
