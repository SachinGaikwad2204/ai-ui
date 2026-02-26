import { useState, useEffect, useRef } from "react";

const API = "https://ai-backend-xa12.onrender.com/api/ai";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSessions = async () => {
    const res = await fetch(`${API}/sessions`);
    const data = await res.json();
    setSessions(data);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "USER", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const res = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: input,
        sessionId: currentSession,
      }),
    });

    const text = await res.text();

    setMessages((prev) => [
      ...prev,
      { role: "AI", content: text },
    ]);

    setInput("");
    setLoading(false);
    fetchSessions();
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">

      {/* Sidebar */}
      <div className="w-64 bg-gray-800 hidden md:flex flex-col p-4">
        <button
          onClick={() => {
            setCurrentSession(null);
            setMessages([]);
          }}
          className="bg-blue-600 p-2 rounded mb-4"
        >
          + New Chat
        </button>

        <div className="overflow-y-auto flex-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setCurrentSession(s.id)}
              className="p-2 hover:bg-gray-700 rounded cursor-pointer"
            >
              {s.title}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-col flex-1">

        {/* Header (Mobile) */}
        <div className="md:hidden p-3 bg-gray-800 text-center">
          AI Chat
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-lg p-3 rounded-lg ${
                msg.role === "USER"
                  ? "bg-blue-600 ml-auto"
                  : "bg-gray-700"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {loading && (
            <div className="bg-gray-700 p-3 rounded-lg w-20">
              ...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-gray-800 flex gap-2">
          <input
            className="flex-1 p-2 rounded bg-gray-700 outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 px-4 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
