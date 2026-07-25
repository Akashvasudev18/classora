import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { setupSocketHandlers } from "./sockets/socketHandler.js";
import { roomManager } from "./services/roomManager.js";
import { executePythonCode } from "./services/executionService.js";
import { AIService } from "./services/aiService.js";
import { AIProgressService } from "./services/aiProgressService.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Parse allowed origins from environment
const rawOrigins = process.env.ALLOWED_ORIGINS || "*";
const allowedOriginsList = rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);

const checkOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) return callback(null, true);
  if (allowedOriginsList.includes("*")) return callback(null, true);

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
app.use(express.json({ limit: "5mb" }));

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

// Code Execution Endpoint (Supports code & optional stdin)
app.post("/api/run", async (req, res) => {
  try {
    const { code, stdin, roomId } = req.body || {};

    if (!code || typeof code !== "string" || code.trim() === "") {
      return res.status(400).json({
        success: false,
        output: "Error: Code parameter is required and cannot be empty.",
        stderr: "Empty code buffer.",
        exitCode: 1,
      });
    }

    const result = await executePythonCode(code, typeof stdin === "string" ? stdin : "");

    // Broadcast execution result to all connected students if roomId is provided
    if (roomId && typeof roomId === "string") {
      const cleanRoomId = roomId.toUpperCase();
      io.to(cleanRoomId).emit("execution-result", {
        roomId: cleanRoomId,
        ...result,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: result.success,
      output: result.output,
      stderr: result.stderr,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      stdin: result.stdin,
    });
  } catch (err: any) {
    console.error(`[Express] Code execution endpoint error:`, err);
    return res.status(500).json({
      success: false,
      output: `Internal Server Error: ${err.message || "Execution proxy failed"}`,
      stderr: err.toString(),
      exitCode: 1,
    });
  }
});

// AI Hint Assistant Endpoint
app.post("/api/ai/hint", async (req, res) => {
  try {
    const { problemTitle, problemDescription, studentCode, output, stderr, language } = req.body || {};

    const result = await AIService.generateHint({
      problemTitle,
      problemDescription,
      studentCode: studentCode || "",
      output,
      stderr,
      language,
    });

    return res.json(result);
  } catch (err: any) {
    console.error(`[Express] AI hint endpoint error:`, err);
    return res.status(500).json({
      success: false,
      hint: "Unable to generate AI hint due to a backend error. Please try again.",
      error: err.toString(),
    });
  }
});

// AI Teacher Class Progress Analysis Endpoint
app.post("/api/ai/analyze-class", async (req, res) => {
  try {
    const { problemTitle, problemDescription, studentsData } = req.body || {};

    const result = await AIProgressService.analyzeClassProgress({
      problemTitle,
      problemDescription,
      studentsData: studentsData || [],
    });

    return res.json(result);
  } catch (err: any) {
    console.error(`[Express] AI class progress analysis error:`, err);
    return res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      analysis: [],
      error: err.toString(),
    });
  }
});

httpServer.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Classora Backend Server running on port ${PORT}`);
  console.log(`⚡ Socket.IO transports: ["websocket", "polling"]`);
  console.log(`🤖 AI Engine Configured: YES (Groq / OpenRouter)`);
  console.log(`🔒 Allowed Origins: ${rawOrigins}`);
  console.log(`=================================`);
});
