import React, { useState } from "react";

function ChatBot({ groupId }) {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! Ask me anything about your group resources." },
  ]);
  console.log("Group Id",groupId)
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { from: "user", text: input }]);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input, groupId }), // ✅ include groupId
      });
      console.log(res)
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: data.answer || "No response from server." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "Error contacting chatbot." },
      ]);
    }

    setInput("");
  };

  return (
    <div className="fixed bottom-4 right-4 w-[350px] h-[450px] bg-white shadow-lg border rounded-xl p-4 flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-md max-w-[80%] ${
              msg.from === "bot"
                ? "bg-gray-200 self-start"
                : "bg-blue-500 text-white self-end"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded-l-md px-2 py-1 outline-none"
          placeholder="Type your message..."
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-1 rounded-r-md hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatBot;
