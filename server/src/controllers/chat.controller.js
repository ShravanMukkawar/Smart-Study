import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import Message from "../models/Message.model.js";
import Chat from "../models/chat.js";

/**
 * Get messages for a specific group
 */
const getMessages = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const messages = await Message.find({ groupId }).populate("sender", "username");

  res.status(200).json({
    success: true,
    data: messages,
  });
});

/**
 * Start a new chat or retrieve an existing one
 */
const startChat = asyncHandler(async (req, res) => {
  const { user1, user2 } = req.body;

  if (!user1 || !user2) {
    throw new ApiError(400, "Both users are required to start a chat");
  }

  let chat = await Chat.findOne({
    participants: { $all: [user1, user2] },
  });

  if (!chat) {
    chat = await Chat.create({ participants: [user1, user2], messages: [] });
  }

  res.status(200).json({ chatId: chat._id });
});

/**
 * Fetch messages for a specific chat
 */
const getChatMessages = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
  
    const chat = await Chat.findById(chatId)
      .populate("messages.sender", "username")
      .lean(); // Converts to plain JSON
  
    if (!chat) {
      throw new ApiError(404, "Chat not found");
    }
  
    res.status(200).json({ success: true, messages: chat.messages || [] });
  });
  
/**
 * Send a new message in a chat
 */

const sendMessage = async (req, res) => {
  try {
    const { message, username, userId, groupId, timestamp } = req.body;

    if (!message || !userId || !groupId) {
      return res.status(400).json({ error: "Sender, message, and groupId are required" });
    }

    const chat = await Chat.findOne({ _id: groupId });

    if (!chat) {
      return res.status(404).json({ error: "Chat group not found" });
    }

    // Push new message to messages array
    chat.messages.push({
      sender: userId,
      text: message,
      timestamp: timestamp || Date.now()
    });

    await chat.save();

    res.status(201).json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export { getMessages, getChatMessages, sendMessage, startChat };
