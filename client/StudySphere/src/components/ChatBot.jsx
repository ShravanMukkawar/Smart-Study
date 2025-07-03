import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux"
import { MessageSquare, Plus, Send, Bot, User, Sparkles, Clock, ChevronRight } from "lucide-react";

function ChatBot({ groupId }) {
  const [chatList, setChatList] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch chat list
  const user = useSelector((state) => state.auth.userData);
  const userId = user._id;
  console.log("userid",userId)
  useEffect(() => {
    if (groupId && userId) {
      fetch(`http://localhost:8000/list_chats?groupId=${groupId}&userId=${userId}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setChatList(data);
          else setChatList([]);
        })
        .catch(() => setChatList([]));
    }
  }, [groupId]);

  // Fetch message history
  const loadMessages = async (groupId, chatId) => {
    if (!groupId || !chatId) return;

    try {
      const res = await fetch("http://localhost:8000/get_chat_history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, chatId,userId }),
      });
      const data = await res.json();
      setMessages(data.history || []);
    } catch (err) {
      console.error("Failed to fetch chat history", err);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const newMsg = { from: "user", text: input };
    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, chatId, input,userId }),
      });
      const data = await res.json();

      setMessages((prev) => [...prev, { from: "bot", text: data.answer }]);
      setInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [...prev, { from: "bot", text: "Sorry, I couldn't process your request. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    setChatId(newId);
    setMessages([{ from: "bot", text: "Hi! Ask me anything about your group resources." }]);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-50 to-blue-50 font-inter">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 shadow-lg flex flex-col">
        {/* Sidebar Header */}
        <div className="px-6 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Assistant</h2>
              <p className="text-blue-100 text-sm">Powered by advanced AI</p>
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={handleNewChat}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-2">
            {chatList.map((chat) => {
              const id = chat.chatId || chat._id;
              const isActive = id === chatId;
              return (
                <div
                  key={id}
                  onClick={() => {
                    if (id !== chatId) {
                      setChatId(id);
                      loadMessages(groupId, id);
                    }
                  }}
                  className={`group p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-md" 
                      : "hover:bg-gray-50 border-2 border-transparent hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                      <MessageSquare className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                        {chat.title || `Chat ${id.slice(-4)}`}
                      </p>
                      <p className={`text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {chat.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Sparkles className="w-4 h-4" />
            <span>AI-powered conversations</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="border-b border-gray-200 p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {chatId ? `Chat ${chatId.slice(-4)}` : "Welcome to AI Assistant"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {chatId ? "Ask me anything about your group resources" : "Select or create a chat to get started"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !chatId && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bot className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Your Conversation</h3>
                <p className="text-gray-500 mb-6">Create a new chat to begin interacting with your AI assistant</p>
                <button
                  onClick={handleNewChat}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Start New Chat
                </button>
              </div>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} items-end space-x-3`}
            >
              {msg.from === "bot" && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[70%] px-5 py-3 rounded-2xl shadow-sm ${
                  msg.from === "bot"
                    ? "bg-gray-100 text-gray-900 rounded-bl-md"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <div className={`text-xs mt-2 ${msg.from === "bot" ? "text-gray-500" : "text-blue-100"}`}>
                  {formatTime(Date.now())}
                </div>
              </div>

              {msg.from === "user" && (
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start items-end space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 text-gray-900 px-5 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        {chatId && (
          <div className="border-t border-gray-200 p-6 bg-white">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={loading}
                  className="w-full border-2 border-gray-200 rounded-xl px-6 py-4 pr-12 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-500 text-sm"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <kbd className="text-xs bg-gray-100 px-2 py-1 rounded">Enter</kbd>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white p-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatBot;