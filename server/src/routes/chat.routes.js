import {
    getMessages,getChatMessages,sendMessage,startChat
} from "../controllers/chat.controller.js"

import { verifyJWT } from "../middlewares/auth.middleware.js"

import { Router } from 'express'

const router = Router()

router.route('/:groupId').get(verifyJWT, getMessages)
router.post("/start", startChat);

// Get messages for a specific chat
router.get("/:chatId/messages", getChatMessages);

// Send a message in a chat
router.post("/:chatId/messages", sendMessage);
export default router