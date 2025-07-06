import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { io } from 'socket.io-client';
import moment from 'moment';
import { Comment } from 'react-loader-spinner';
import { motion, AnimatePresence } from 'framer-motion';

const apiUrl = import.meta.env.VITE_API_URL; // "http://localhost:5000"

function ChatComponent({ groupId, userId, username }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socket = io(apiUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('🔗 Socket connected:', socket.id);
        setConnected(true);
        socket.emit('user_register', { userId, username });
      });

      socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
        setConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        setConnected(false);
      });

      socket.on('reconnect', () => {
        console.log('🔄 Socket reconnected');
        setConnected(true);
      });

      return socket;
    };

    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, username, apiUrl]);

  // Handle group joining and message listeners
  useEffect(() => {
    if (!socketRef.current || !groupId || !connected) return;

    const socket = socketRef.current;
    setLoading(true);

    // Join the group
    socket.emit('join_group', { groupId, userId, username });

    // Listen for chat history
    const handleChatHistory = (data) => {
      console.log('📚 Received chat history:', data.messages.length, 'messages');
      setMessages(data.messages);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    };

    // Listen for new messages
    const handleNewMessage = (messageData) => {
      console.log('💬 New message received:', messageData);
      setMessages(prev => [...prev, messageData]);
      setTimeout(scrollToBottom, 100);
    };

    // Listen for join confirmation
    const handleJoinSuccess = (data) => {
      console.log('✅ Successfully joined group:', data.groupId);
    };

    // Listen for errors
    const handleError = (error) => {
      console.error('❌ Socket error:', error);
      setLoading(false);
    };

    // Set up event listeners
    socket.on('chat_history', handleChatHistory);
    socket.on('new_message', handleNewMessage);
    socket.on('join_success', handleJoinSuccess);
    socket.on('error', handleError);

    // Cleanup function
    return () => {
      socket.emit('leave_group', { groupId, userId });
      socket.off('chat_history', handleChatHistory);
      socket.off('new_message', handleNewMessage);
      socket.off('join_success', handleJoinSuccess);
      socket.off('error', handleError);
    };
  }, [groupId, userId, username, connected]);

  const sendMessage = () => {
    if (!message.trim() || !socketRef.current || !connected) {
      console.warn('Cannot send message: no message, socket, or not connected');
      return;
    }

    const messageData = {
      groupId,
      userId,
      username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Sending message:', messageData);
    socketRef.current.emit('send_message', messageData);
    setMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
  <div className="flex flex-col w-full h-full bg-white rounded-xl shadow-lg border border-gray-200">
    {/* Header */}
    <div className="px-4 py-3 bg-indigo-600 text-white rounded-t-xl flex justify-between items-center">
      <h2 className="text-lg font-semibold">Group Chat</h2>
      <span
        className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}
        title={connected ? 'Connected' : 'Disconnected'}
      ></span>
    </div>

    {/* Chat Body */}
    <div className="flex-grow overflow-y-auto p-4 bg-gray-50" style={{ maxHeight: '500px' }}>
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Comment visible={true} height="60" width="60" color="#4F46E5" backgroundColor="#E5E7EB" />
        </div>
      ) : (
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg._id || `${msg.timestamp}-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex mb-2 ${msg.userId === userId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[75%] shadow ${
                  msg.userId === userId
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {msg.userId !== userId && (
                  <div className="text-xs font-semibold text-indigo-600 mb-1">{msg.username}</div>
                )}
                <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                <div
                  className={`text-xs mt-1 text-right ${
                    msg.userId === userId ? 'text-indigo-100' : 'text-gray-400'
                  }`}
                >
                  {moment(msg.timestamp).format('h:mm A')}
                </div>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </AnimatePresence>
      )}
    </div>

    {/* Input Box */}
    <div className="p-3 bg-white border-t border-gray-200 rounded-b-xl">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!connected}
          placeholder={connected ? 'Type a message...' : 'Connecting...'}
          className="flex-grow px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <motion.button
          whileHover={{ scale: connected ? 1.03 : 1 }}
          whileTap={{ scale: connected ? 0.97 : 1 }}
          onClick={sendMessage}
          disabled={!connected || !message.trim()}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </motion.button>
      </div>
    </div>
  </div>
);

}

ChatComponent.propTypes = {
  groupId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
};

export default ChatComponent;