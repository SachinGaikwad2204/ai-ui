import React, { useState, useEffect, useRef } from "react";

const API = "https://ai-backend-xa12.onrender.com/api/ai";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);

  /* ---------------- AUTO SCROLL ---------------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------------- LOAD SESSIONS ---------------- */
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const res = await fetch(`${API}/sessions`);
    const data = await res.json();
    setSessions(data);
  };

  /* ---------------- CREATE SESSION ---------------- */
  const createSession = async () => {
    const res = await fetch(`${API}/sessions`, { method: "POST" });
    const data = await res.json();
    setSessionId(data.id);
    setMessages([
      { role: "assistant", content: "How can I help you today?" },
    ]);
    loadSessions();
  };

  /* ---------------- LOAD MESSAGES ---------------- */
  const loadMessages = async (id) => {
    const res = await fetch(`${API}/sessions/${id}`);
    const data = await res.json();

    const formatted = data.map((msg) => ({
      role: msg.role === "USER" ? "user" : "assistant",
      content: msg.content,
    }));

    setMessages(formatted);
    setSessionId(id);
  };

  /* ---------------- DELETE SESSION ---------------- */
  const deleteSession = async (id) => {
    await fetch(`${API}/sessions/${id}`, {
      method: "DELETE",
    });

    if (id === sessionId) {
      setMessages([]);
      setSessionId(null);
    }

    loadSessions();
  };

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage = input;
    setInput("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);

    const response = await fetch(
      `${API}/chat/${sessionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: userMessage,
      }
    );

    const data = await response.text();

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data },
    ]);

    loadSessions();
  };

  /* ---------------- THEME COLORS ---------------- */
  const theme = {
    bg: darkMode ? "#0f172a" : "#f9fafb",
    sidebar: darkMode ? "#111827" : "#e5e7eb",
    chatBg: darkMode ? "#1f2937" : "#ffffff",
    text: darkMode ? "white" : "black",
    inputBg: darkMode ? "#1f2937" : "#ffffff",
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text }}>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{ width: 260, background: theme.sidebar, padding: 15 }}>
          <button
            style={buttonStyle}
            onClick={createSession}
          >
            + New Chat
          </button>

          <div style={{ marginTop: 20 }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: 10,
                  borderRadius: 6,
                  background: sessionId === s.id ? "#2563eb" : theme.chatBg,
                  marginBottom: 10,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span onClick={() => loadMessages(s.id)}>
                  {s.title}
                </span>
                <span
                  onClick={() => deleteSession(s.id)}
                  style={{ cursor: "pointer", color: "red" }}
                >
                  🗑
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* TOP BAR */}
        <div style={{
          padding: 10,
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid gray"
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>

          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "🌞 Light" : "🌙 Dark"}
          </button>
        </div>

        {/* CHAT AREA */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent:
                  msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 15,
              }}
            >
              <div
                style={{
                  background:
                    msg.role === "user"
                      ? "#2563eb"
                      : theme.chatBg,
                  padding: 12,
                  borderRadius: 10,
                  maxWidth: "70%",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div style={{ padding: 15, borderTop: "1px solid gray" }}>
          <div style={{ display: "flex" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message ChatGPT..."
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                border: "1px solid gray",
                background: theme.inputBg,
                color: theme.text,
              }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              style={{
                marginLeft: 10,
                padding: "12px 20px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "white",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
};

export default App;
