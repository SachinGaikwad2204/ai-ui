import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "https://ai-backend-xa12.onrender.com/api/ai";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [renamingId, setRenamingId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    const res = await fetch(`${API_BASE}/sessions`);
    const data = await res.json();
    setSessions(data.reverse());
  };

  const createSession = async () => {
    const res = await fetch(`${API_BASE}/sessions`, { method: "POST" });
    const data = await res.json();
    setSessions([data, ...sessions]);
    setCurrentSessionId(data.id);
    setMessages([]);
  };

  const loadMessages = async (id) => {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    const data = await res.json();
    setMessages(data);
    setCurrentSessionId(id);
  };

  const deleteSession = async (id) => {
    await fetch(`${API_BASE}/sessions/${id}`, { method: "DELETE" });
    setSessions(sessions.filter((s) => s.id !== id));
    if (id === currentSessionId) {
      setMessages([]);
      setCurrentSessionId(null);
    }
  };

  const renameSession = async (id, newTitle) => {
    await fetch(`${API_BASE}/sessions/${id}/rename`, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: newTitle,
    });
    loadSessions();
    setRenamingId(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentSessionId) return;

    const userMsg = { role: "USER", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const prompt = input;
    setInput("");

    const eventSource = new EventSource(
      `${API_BASE}/chat/stream/${currentSessionId}?prompt=${encodeURIComponent(prompt)}`
    );

    let aiMessage = { role: "AI", content: "" };
    setMessages((prev) => [...prev, aiMessage]);

    eventSource.onmessage = (event) => {
      aiMessage.content += event.data;
      setMessages((prev) => [...prev.slice(0, -1), { ...aiMessage }]);
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
  };

  return (
    <div style={styles.app}>
      {sidebarOpen && (
        <div style={styles.sidebar}>
          <button style={styles.newBtn} onClick={createSession}>
            + New Chat
          </button>

          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                ...styles.sessionItem,
                background:
                  currentSessionId === s.id ? "#374151" : "transparent",
              }}
            >
              {renamingId === s.id ? (
                <input
                  autoFocus
                  defaultValue={s.title}
                  onBlur={(e) =>
                    renameSession(s.id, e.target.value)
                  }
                />
              ) : (
                <span onClick={() => loadMessages(s.id)}>
                  {s.title}
                </span>
              )}

              <div>
                <button
                  onClick={() => setRenamingId(s.id)}
                  style={styles.iconBtn}
                >
                  ✎
                </button>
                <button
                  onClick={() => deleteSession(s.id)}
                  style={styles.iconBtn}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.chatArea}>
        <button
          style={styles.toggleBtn}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>

        <div style={styles.messages}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                textAlign: msg.role === "USER" ? "right" : "left",
                marginBottom: 10,
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
          <div ref={bottomRef}></div>
        </div>

        <div style={styles.inputArea}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={styles.input}
            placeholder="Type your message..."
            onKeyDown={(e) =>
              e.key === "Enter" && sendMessage()
            }
          />
          <button style={styles.sendBtn} onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { display: "flex", height: "100vh", background: "#0f172a", color: "white" },
  sidebar: { width: 260, background: "#111827", padding: 15, overflowY: "auto" },
  chatArea: { flex: 1, display: "flex", flexDirection: "column" },
  newBtn: { width: "100%", padding: 10, background: "#2563eb", border: "none", borderRadius: 6, color: "white" },
  sessionItem: { display: "flex", justifyContent: "space-between", padding: 8, borderRadius: 6, marginBottom: 6, cursor: "pointer" },
  iconBtn: { background: "transparent", border: "none", color: "white", cursor: "pointer", marginLeft: 5 },
  toggleBtn: { background: "transparent", border: "none", color: "white", fontSize: 20, margin: 10, cursor: "pointer" },
  messages: { flex: 1, padding: 20, overflowY: "auto" },
  message: { display: "inline-block", padding: 10, borderRadius: 8, maxWidth: "65%" },
  inputArea: { display: "flex", padding: 15, background: "#111827" },
  input: { flex: 1, padding: 10, background: "#1f2937", color: "white", border: "none", borderRadius: 6 },
  sendBtn: { marginLeft: 10, padding: "10px 18px", background: "#2563eb", border: "none", borderRadius: 6, color: "white" },
};

export default App;
