import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "https://ai-backend-xa12.onrender.com/api/ai";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------------- LOAD SESSIONS ----------------
  const loadSessions = async () => {
    const res = await fetch(`${API_BASE}/sessions`);
    const data = await res.json();
    setSessions(data);
  };

  // ---------------- NEW CHAT ----------------
  const createNewSession = async () => {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
    });

    const newSession = await res.json();
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  // ---------------- LOAD MESSAGES ----------------
  const loadMessages = async (id) => {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    const data = await res.json();
    setMessages(data);
    setCurrentSessionId(id);
  };

  // ---------------- DELETE CHAT ----------------
  const deleteSession = async (id) => {
    await fetch(`${API_BASE}/sessions/${id}`, {
      method: "DELETE",
    });

    setSessions((prev) => prev.filter((s) => s.id !== id));

    if (currentSessionId === id) {
      setMessages([]);
      setCurrentSessionId(null);
    }
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = async () => {
    if (!input.trim() || !currentSessionId) return;

    const userMsg = { role: "USER", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const messageText = input;
    setInput("");
    setLoading(true);

    const res = await fetch(
      `${API_BASE}/chat/${currentSessionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: messageText,
      }
    );

    const text = await res.text();
    const aiMsg = { role: "AI", content: text };

    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
  };

  return (
    <div style={styles.app}>
      
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <button onClick={createNewSession} style={styles.newChatBtn}>
          + New Chat
        </button>

        <div style={{ marginTop: 20 }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                ...styles.sessionItem,
                background:
                  currentSessionId === s.id
                    ? "#374151"
                    : "transparent",
              }}
            >
              <span onClick={() => loadMessages(s.id)}>
                {s.title || "New Chat"}
              </span>

              <button
                onClick={() => deleteSession(s.id)}
                style={styles.deleteBtn}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={styles.chatArea}>
        <div style={styles.messages}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                textAlign:
                  msg.role === "USER" ? "right" : "left",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  ...styles.message,
                  background:
                    msg.role === "USER"
                      ? "#2563eb"
                      : "#1f2937",
                }}
              >
                <ReactMarkdown>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ opacity: 0.6 }}>
              AI is typing...
            </div>
          )}

          <div ref={bottomRef}></div>
        </div>

        <div style={styles.inputArea}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            style={styles.input}
            onKeyDown={(e) =>
              e.key === "Enter" && sendMessage()
            }
          />
          <button onClick={sendMessage} style={styles.sendBtn}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- STYLES ----------------
const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#0f172a",
    color: "white",
    fontFamily: "sans-serif",
  },
  sidebar: {
    width: 260,
    background: "#111827",
    padding: 15,
    borderRight: "1px solid #1f2937",
  },
  newChatBtn: {
    width: "100%",
    padding: 10,
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    color: "white",
    cursor: "pointer",
  },
  sessionItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    cursor: "pointer",
    marginBottom: 6,
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "#ef4444",
    cursor: "pointer",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  messages: {
    flex: 1,
    padding: 20,
    overflowY: "auto",
  },
  message: {
    display: "inline-block",
    padding: 10,
    borderRadius: 8,
    maxWidth: "65%",
  },
  inputArea: {
    display: "flex",
    padding: 15,
    borderTop: "1px solid #1f2937",
    background: "#111827",
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    border: "none",
    outline: "none",
  },
  sendBtn: {
    marginLeft: 10,
    padding: "10px 18px",
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    color: "white",
    cursor: "pointer",
  },
};

export default App;
