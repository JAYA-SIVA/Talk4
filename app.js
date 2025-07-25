// app.js

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");

dotenv.config();

// ──────────────────────────────
// ✅ MongoDB Connection
// ──────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// ──────────────────────────────
// ✅ Express App + Middleware
// ──────────────────────────────
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // 🔐 In production, set your frontend domain
  },
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────
// ✅ Routes Setup
// ──────────────────────────────
const apiRouter = express.Router();

// 🔐 Routes (All mounted under /api)
apiRouter.use("/auth", require("./routes/auth"));
apiRouter.use("/user", require("./routes/userRoutes"));
apiRouter.use("/otp", require("./routes/otpRoutes"));
apiRouter.use("/chat", require("./routes/chatRoutes"));
apiRouter.use("/message", require("./routes/messageRoutes"));
apiRouter.use("/notifications", require("./routes/notificationRoutes"));
apiRouter.use("/posts", require("./routes/postRoutes"));
apiRouter.use("/reels", require("./routes/reelRoutes"));
apiRouter.use("/story", require("./routes/storyRoutes"));
apiRouter.use("/bookmarks", require("./routes/bookmarkRoutes"));
apiRouter.use("/admin", require("./routes/admin"));
apiRouter.use("/talk", require("./routes/talk"));

// 📦 Mount all routes at /api prefix
app.use("/api", apiRouter);

// ──────────────────────────────
// ✅ Health Check
// ──────────────────────────────
app.get("/", (req, res) => {
  res.send("🚀 Talk App API is running with Socket.IO");
});

// ──────────────────────────────
// ✅ SOCKET.IO - Real-time Chat
// ──────────────────────────────
io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  // Join user to their personal room
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    console.log("👤 User joined room:", userData._id);
    socket.emit("connected");
  });

  // Join specific chat room
  socket.on("join chat", (roomId) => {
    socket.join(roomId);
    console.log("📦 User joined chat:", roomId);
  });

  // Typing status
  socket.on("typing", (room) => socket.to(room).emit("typing"));
  socket.on("stop typing", (room) => socket.to(room).emit("stop typing"));

  // New message handling
  socket.on("new message", (message) => {
    const chat = message.chat;
    if (!chat || !chat.users) return;

    chat.users.forEach((user) => {
      if (user._id === message.sender._id) return;
      socket.to(user._id).emit("message received", message);
    });
  });

  // On disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ──────────────────────────────
// ✅ Start Server
// ──────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
