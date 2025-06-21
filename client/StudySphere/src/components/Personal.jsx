import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";

// Use environment variable for API URL
const API_BASE_URL = "http://localhost:5000";
const socket = io(API_BASE_URL); // Connect to backend

export default function Personal() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loadingChats, setLoadingChats] = useState({}); // Track loading per user

  const user = useSelector((state) => state.auth.userData);

  useEffect(() => {
    if (user?._id) {
      setCurrentUserId(user._id);
    }
  }, [user]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/v1/users/search`, {
          params: {
            userId: currentUserId       // dynamically set your logged-in user ID here
          }
        });
        
        // Filter out current user
        const filteredUsers = data.filter(u => u._id !== currentUserId);
        setUsers(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) {
      fetchUsers();
    }
  }, [currentUserId]);

  const handleStartChat = useCallback(
    async (userId) => {
      if (loadingChats[userId]) return; // Prevent multiple clicks for the same user
      setLoadingChats((prev) => ({ ...prev, [userId]: true }));

      try {
        if (!currentUserId) {
          throw new Error("User not authenticated");
        }

        const response = await axios.post(
          `${API_BASE_URL}/api/v1/chat/start`,
          { user1: currentUserId, user2: userId },
          { withCredentials: true }
        );
        
        if (!response.data?.chatId) {
          throw new Error("Failed to retrieve chat ID");
        }

        navigate(`/chat/${response.data.chatId}`);
      } catch (error) {
        console.error("Error starting chat:", error);
        alert("Something went wrong: " + error.message);
      } finally {
        setLoadingChats((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [currentUserId, loadingChats, navigate]
  );

  // Generate initials for fallback avatar
  const getInitials = (username) => {
    return username ? username.charAt(0).toUpperCase() : "U";
  };

  // Generate a random color based on username for avatar background
  const getAvatarColor = (username) => {
    const colors = [
      "bg-blue-600", "bg-emerald-600", "bg-violet-600", 
      "bg-indigo-600", "bg-teal-600", "bg-sky-600"
    ];
    
    const index = username ? 
      username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length : 
      0;
    
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          <p className="mt-4 text-blue-600 font-medium">Loading professional network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-md max-w-md w-full border border-gray-100">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mt-4">Connection Error</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          className="max-w-4xl mx-auto mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Professional Network</h1>
          <p className="text-gray-500 text-center">Connect with talented professionals and experts in your field</p>
        </motion.div>

        {users.length === 0 ? (
          <motion.div 
            className="text-center p-12 bg-white rounded-xl shadow-md max-w-md mx-auto border border-gray-100"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-600 mt-4 text-lg">No professionals found in your network</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user, index) => (
              <motion.div
                key={user._id || index}
                className="bg-white rounded-xl shadow-sm hover:shadow-md overflow-hidden transition-all duration-300 border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    {user.profilePic ? (
                      <img 
                        src={user.profilePic} 
                        alt={`${user.username}'s profile`}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm flex-shrink-0 ${getAvatarColor(user.username)}`}>
                        {getInitials(user.username)}
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{user.username}</h3>
                      {user.branch && (
                        <p className="text-gray-500 text-sm mt-1">{user.branch}</p>
                      )}
                    </div>
                  </div>
                  
                  {user.skills && user.skills.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Core Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {user.skills.map((skill, i) => (
                          <span 
                            key={i} 
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 flex items-center justify-between">
                    <motion.button
                      onClick={() => handleStartChat(user._id)}
                      className={`flex-1 py-2.5 text-white rounded-lg transition-all duration-300 ${
                        loadingChats[user._id]
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 hover:shadow"
                      }`}
                      disabled={loadingChats[user._id]}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loadingChats[user._id] ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Connecting
                        </span>
                      ) : (
                        "Message"
                      )}
                    </motion.button>
                    
                    <motion.button
                      className="ml-2 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path>
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}