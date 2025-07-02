import React, { useEffect, useState } from "react";
import { MessageCircle, Plus, Send, Bot, User } from "lucide-react";

function ChatBot({ groupId }) {
  const [chatList, setChatList] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch chat list
  useEffect(() => {
    if (groupId) {
      fetch(`http://localhost:8000/list_chats?groupId=${groupId}`)
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
        body: JSON.stringify({ groupId, chatId }),
      });
      const data = await res.json();
      setMessages(data.history || []);
    } catch (err) {
      console.error("Failed to fetch chat history", err);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const newMsg = { from: "user", text: input };
    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, chatId, input }),
      });
      const data = await res.json();

      setMessages((prev) => [...prev, { from: "bot", text: data.answer }]);
    } catch (err) {
      console.error("Failed to send message", err);
      setMessages((prev) => [...prev, { from: "bot", text: "Sorry, I encountered an error. Please try again." }]);
    }
    
    setInput("");
    setIsLoading(false);
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-inter">
      {/* Sidebar */}
      <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-slate-200/60 shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/60">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Chat Assistant
            </h1>
          </div>

          <button
            onClick={handleNewChat}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chatList.length === 0 ? (
            <div className="text-center text-slate-500 mt-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            chatList.map((chat) => {
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
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 group ${
                    isActive 
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-md" 
                      : "hover:bg-slate-50 border-2 border-transparent hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                      <MessageCircle className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm truncate ${isActive ? 'text-blue-900' : 'text-slate-700'}`}>
                        {chat.title || `Chat ${id.slice(-4)}`}
                      </h3>
                      <p className={`text-xs mt-1 ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                        Recent conversation
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-sm">
        {/* Chat Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">AI Assistant</h2>
              <p className="text-sm text-slate-500">Ready to help with your questions</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Welcome to Chat Assistant</h3>
                <p className="text-slate-600">Start a conversation by typing a message below. I'm here to help with any questions you have!</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${msg.from === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  msg.from === "bot" 
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600" 
                    : "bg-gradient-to-r from-blue-500 to-purple-600"
                }`}>
                  {msg.from === "bot" ? (
                    <Bot className="w-5 h-5 text-white" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message */}
                <div className={`max-w-[70%] ${msg.from === "user" ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`px-6 py-4 rounded-2xl shadow-sm backdrop-blur-sm border ${
                    msg.from === "bot"
                      ? "bg-white/90 border-slate-200/60 text-slate-800 rounded-tl-md"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500/20 text-white rounded-tr-md"
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span className="text-xs text-slate-500 mt-2 px-2">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white/90 border border-slate-200/60 px-6 py-4 rounded-2xl rounded-tl-md shadow-sm backdrop-blur-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200/60 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4 bg-white rounded-2xl shadow-lg border border-slate-200/60 p-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-transparent outline-none text-slate-800 placeholder-slate-500 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 text-white p-3 rounded-xl transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Press Enter to send • Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatBot;