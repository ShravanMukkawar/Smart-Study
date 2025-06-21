import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import { useSelector } from "react-redux";

const socket = io("http://localhost:5000"); // Connect to backend

export default function ChatPage() {
  const { chatId } = useParams(); // Get chat ID from URL
  const user = useSelector((state) => state.auth.userData); // Get logged-in user
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/v1/chat/${chatId}/messages`,
          { withCredentials: true }
        );

        const fetchedMessages = response.data?.messages || []; // Ensure it's always an array
        setMessages(Array.isArray(fetchedMessages) ? fetchedMessages : []); // Double-check response
      } catch (error) {
        console.error("Error fetching messages:", error);
        setMessages([]); // Prevent map error by defaulting to empty array
      }
    };

    fetchMessages();
  })
    const handleNewMessage = (message) => {
        if (message.groupId === chatId) {
          setMessages((prev) => [...prev, message]); // Update UI in real-time
        }
      };
      
      useEffect(() => {
        if (!chatId) return;
      
        socket.on("new_group_message", handleNewMessage); // Use new event name
      
        return () => {
          socket.off("new_group_message", handleNewMessage); // Cleanup listener
        };
      }, [chatId]);
      
      const sendMessage = async () => {
        if (!newMessage.trim()) return;
      
        try {
          const messageData = {
            message: newMessage,
            username: user.username,
            userId: user._id,
            groupId: chatId, // Use groupId instead of chatId
            timestamp: new Date().toISOString(),
          };
      
          await axios.post(
            `http://localhost:5000/api/v1/chat/${chatId}/messages`,
            messageData,
            { withCredentials: true }
          );
      
          socket.emit("send_chat_message", messageData); // Use a new unique event name
          setMessages((prev) => [...prev, messageData]); // Update local state
          setNewMessage(""); // Clear input
        } catch (error) {
          console.error("Error sending message:", error);
        }
      };
      
  
  return (
    <div className="flex flex-col h-screen p-6 bg-gray-100">
      <h2 className="text-2xl font-semibold mb-4 text-center">Chat</h2>

      <div className="flex-1 overflow-y-auto bg-white p-4 rounded-lg shadow-md">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">No messages yet</p>
        ) : (
          messages.map((msg, index) => {
            const isMyMessage =
              msg.sender?._id === user?._id || msg.sender === user?._id;

            return (
              <div
                key={msg._id || index} // Use _id if available, else fallback to index
                className={`p-2 my-2 rounded-md ${
                  isMyMessage
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-gray-300 text-black"
                } max-w-xs`}
              >
                <strong>
                  {isMyMessage ? "You" : msg.sender?.username || "Unknown"}
                </strong>
                <p>{msg.text}</p>
                <span className="text-xs text-gray-600">
                  {msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString()
                    : "Time unknown"}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex mt-4">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded-l-md"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}
