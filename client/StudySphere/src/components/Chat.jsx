import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { io } from 'socket.io-client';
import moment from 'moment';
import { Comment } from "react-loader-spinner";
import { motion, AnimatePresence } from 'framer-motion';
 
const apiUrl = import.meta.env.VITE_API_URL;
const socket = io(apiUrl);
 
function ChatComponent({ groupId, userId, username }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
 
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100); // Delay for smooth rendering
  };
 
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
 
  useEffect(() => {
    setLoading(true);
 
    socket.emit('join_group', groupId);
 
    socket.once('chat_history', (history) => {
      setMessages(history);
      setLoading(false);
      scrollToBottom();
    });
 
    const handleNewMessage = (message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    };
 
    socket.on('receive_message', handleNewMessage);
 
    return () => {
      socket.emit('leave_group', groupId);
      socket.off('receive_message', handleNewMessage);
      socket.off('chat_history');
    };
  }, [groupId]);  
 
  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        groupId,
        message,
        userId,
        username,
        timestamp: new Date().toISOString(),
      };
 
      socket.emit('send_message', newMessage, (ack) => {
        if (ack?.success) {
          console.log("Message sent successfully");
        } else {
          console.error("Failed to send message:", ack?.error);
        }
      });
 
      setMessage('');
    }
  };
 
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents line breaks
      sendMessage();
    }
  };
 
  return (
<div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col" style={{ aspectRatio: "1/1" }}>
      {loading ? (
<div className="flex items-center justify-center h-full">
<Comment
            visible={true}
            height="80"
            width="80"
            ariaLabel="comment-loading"
            wrapperClass="comment-wrapper"
            color="#6366F1"
            backgroundColor="#F3F4F6"
          />
</div>
      ) : (
<>
<div className="p-3 bg-indigo-500 rounded-t-lg">
<h2 className="text-lg font-bold text-white">Group Chat</h2>
</div>
 
          <div className="flex-grow overflow-y-auto p-3 space-y-2 bg-gray-50">
<AnimatePresence>
              {messages.map((msg, index) => (
<motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.userId === userId ? 'justify-end' : 'justify-start'}`}
>
<div
                    className={`max-w-xs rounded-lg px-3 py-2 shadow-sm
                      ${msg.userId === userId
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'}`}
>
                    {msg.userId !== userId && (
<div className="font-medium text-xs text-indigo-600 mb-1">
                        {msg.username}
</div>
                    )}
<div className="text-sm">
                      {msg.message}
</div>
<div className={`text-xs mt-1 text-right ${msg.userId === userId ? 'text-indigo-100' : 'text-gray-500'}`}>
                      {moment(msg.timestamp).format('h:mm A')}
</div>
</div>
</motion.div>
              ))}
<div ref={messagesEndRef} />
</AnimatePresence>
</div>
 
          <div className="p-2 bg-gray-100 border-t border-gray-200 rounded-b-lg">
<div className="flex">
<input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown} // Fix: Use onKeyDown instead of onKeyPress
                className="flex-grow p-2 border rounded-l-lg focus:outline-none bg-white border-gray-300 focus:ring-1 focus:ring-indigo-400 text-gray-800 text-sm"
                placeholder="Type your message..."
              />
<motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={sendMessage}
                className="px-4 py-2 bg-indigo-500 text-white font-medium rounded-r-lg focus:outline-none hover:bg-indigo-600 transition-colors duration-200 text-sm"
>
                Send
</motion.button>
</div>
</div>
</>
      )}
</div>
  );
}
 
ChatComponent.propTypes = {
  groupId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
};
 
export default ChatComponent;
 