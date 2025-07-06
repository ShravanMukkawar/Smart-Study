import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import path from 'path';

import Message from "./models/Message.model.js";
 
const app = express();
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, path) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

const corsOptions = {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
 
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
 
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(express.static("public"));
app.use(cookieParser());
 
// Routers
import userRouter from "./routes/user.routes.js";
import groupRouter from "./routes/group.routes.js";
import resourceRouter from "./routes/resource.routes.js";
import chatRouter from "./routes/chat.routes.js";
import whiteboardRouter from "./routes/whiteboard.routes..js";
 
app.use("/api/v1/users", userRouter);
app.use('/api/v1/group', groupRouter);
app.use('/api/v1/resource', resourceRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/whiteboard', whiteboardRouter);
 
const server = createServer(app);
 
// Initialize Socket.io with clean configuration
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Store active connections and group memberships
const activeUsers = new Map(); // socketId -> {userId, username, groups: Set()}
const groupMembers = new Map(); // groupId -> Set(socketId)

// Helper function to get user info by socket ID
const getUserBySocketId = (socketId) => {
  return activeUsers.get(socketId);
};

// Helper function to add user to group
const addUserToGroup = (socketId, groupId) => {
  const user = activeUsers.get(socketId);
  if (user) {
    user.groups.add(groupId);
  }
  
  if (!groupMembers.has(groupId)) {
    groupMembers.set(groupId, new Set());
  }
  groupMembers.get(groupId).add(socketId);
};

// Helper function to remove user from group
const removeUserFromGroup = (socketId, groupId) => {
  const user = activeUsers.get(socketId);
  if (user) {
    user.groups.delete(groupId);
  }
  
  if (groupMembers.has(groupId)) {
    groupMembers.get(groupId).delete(socketId);
    if (groupMembers.get(groupId).size === 0) {
      groupMembers.delete(groupId);
    }
  }
};

// Helper function to clean up user data
const cleanupUser = (socketId) => {
  const user = activeUsers.get(socketId);
  if (user) {
    // Remove user from all groups
    user.groups.forEach(groupId => {
      removeUserFromGroup(socketId, groupId);
    });
    // Remove user from active users
    activeUsers.delete(socketId);
  }
};

io.on("connection", (socket) => {
  console.log(`🔗 New connection: ${socket.id}`);

  // Handle user registration
  socket.on("user_register", (data) => {
    try {
      const { userId, username } = data;
      
      if (!userId || !username) {
        socket.emit("error", { message: "Invalid user data" });
        return;
      }

      // Store user info
      activeUsers.set(socket.id, {
        userId,
        username,
        groups: new Set(),
        socketId: socket.id
      });

      console.log(`👤 User registered: ${username} (${userId}) -> ${socket.id}`);
      console.log(`📊 Total active users: ${activeUsers.size}`);

      socket.emit("registration_success", { userId, username });
    } catch (error) {
      console.error("❌ Error in user registration:", error);
      socket.emit("error", { message: "Registration failed" });
    }
  });

  // Handle joining a group
  socket.on("join_group", async (data) => {
    try {
      const { groupId, userId, username } = data;
      
      if (!groupId || !userId || !username) {
        socket.emit("error", { message: "Invalid group join data" });
        return;
      }

      // Join the socket.io room
      socket.join(groupId);
      
      // Add user to group tracking
      addUserToGroup(socket.id, groupId);
      
      console.log(`🏠 ${username} joined group: ${groupId}`);
      console.log(`👥 Group ${groupId} now has ${groupMembers.get(groupId)?.size || 0} members`);

      // Load and send chat history
      const messages = await Message.find({ groupId })
        .sort({ timestamp: 1 })
        .limit(100) // Limit to last 100 messages
        .lean();

      socket.emit("chat_history", { 
        groupId, 
        messages: messages || [] 
      });

      socket.emit("join_success", { 
        groupId, 
        memberCount: groupMembers.get(groupId)?.size || 0 
      });

      // Notify other group members
      socket.to(groupId).emit("user_joined", {
        userId,
        username,
        groupId
      });

    } catch (error) {
      console.error("❌ Error joining group:", error);
      socket.emit("error", { message: "Failed to join group" });
    }
  });

  // Handle sending messages
  socket.on("send_message", async (data) => {
    try {
      const { groupId, userId, username, message, timestamp } = data;
      
      // Validate data
      if (!groupId || !userId || !username || !message) {
        socket.emit("error", { message: "Invalid message data" });
        return;
      }

      // Verify user is in the group
      const user = getUserBySocketId(socket.id);
      if (!user || !user.groups.has(groupId)) {
        socket.emit("error", { message: "User not in group" });
        return;
      }

      // Create and save message
      const newMessage = new Message({
        groupId,
        userId,
        username,
        message: message.trim(),
        timestamp: timestamp || new Date()
      });

      const savedMessage = await newMessage.save();
      
      console.log(`💬 Message from ${username} in ${groupId}: ${message}`);

      // Broadcast to all group members (including sender)
      io.to(groupId).emit("new_message", {
        _id: savedMessage._id,
        groupId: savedMessage.groupId,
        userId: savedMessage.userId,
        username: savedMessage.username,
        message: savedMessage.message,
        timestamp: savedMessage.timestamp
      });

      console.log(`📤 Message broadcasted to ${groupMembers.get(groupId)?.size || 0} members`);

    } catch (error) {
      console.error("❌ Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle leaving a group
  socket.on("leave_group", (data) => {
    try {
      const { groupId, userId } = data;
      const user = getUserBySocketId(socket.id);
      
      if (!user || !groupId) {
        return;
      }

      // Leave the socket.io room
      socket.leave(groupId);
      
      // Remove from group tracking
      removeUserFromGroup(socket.id, groupId);
      
      console.log(`🚪 ${user.username} left group: ${groupId}`);
      
      // Notify other group members
      socket.to(groupId).emit("user_left", {
        userId: user.userId,
        username: user.username,
        groupId
      });

    } catch (error) {
      console.error("❌ Error leaving group:", error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    try {
      const user = getUserBySocketId(socket.id);
      
      if (user) {
        console.log(`❌ User disconnected: ${user.username} (${socket.id}), reason: ${reason}`);
        
        // Notify all groups the user was in
        user.groups.forEach(groupId => {
          socket.to(groupId).emit("user_left", {
            userId: user.userId,
            username: user.username,
            groupId
          });
        });
      } else {
        console.log(`❌ Unknown user disconnected: ${socket.id}, reason: ${reason}`);
      }

      // Clean up user data
      cleanupUser(socket.id);
      
      console.log(`📊 Remaining active users: ${activeUsers.size}`);
      console.log(`📊 Active groups: ${groupMembers.size}`);

    } catch (error) {
      console.error("❌ Error handling disconnect:", error);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error("🔴 Socket error:", error);
  });
});

// Global error handling
io.on("error", (error) => {
  console.error("🔴 Socket.io server error:", error);
});

// Optional: Add periodic cleanup for orphaned data
setInterval(() => {
  console.log(`📊 Status - Active users: ${activeUsers.size}, Active groups: ${groupMembers.size}`);
}, 30000); // Log every 30 seconds

export { app, server };