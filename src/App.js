import React, { useEffect, useState, useRef } from "react";

const API_URL = "https://ai-backend-xa12.onrender.com/api/ai";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef(null);

  const theme = darkMode
    ? {
        bg: "#0f172a",
        sidebar: "#111827",
        text: "#ffffff",
        assistant: "#1f2937",
        inputBg: "#1f2937",
      }
    : {
        bg: "#f9fafb",
        sidebar: "#e5e7eb",
        text: "#111827",
        assistant: "#e5e7eb",
        inputBg: "#ffffff",
      };

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================= LOAD SESSIONS ================= */
  useEffect(() => {
    const loadSessions = async () => {
      const res = await fetch(`${API_URL}/sessions`);
      const data = await res.json();
      setSessions(data);
    };
    loadSessions();
  }, []);

  /* ================= CREATE SESSION ================= */
  const createSession = async () => {
    const res = await fetch(`${API_URL}/sessions`, {
      method: "POST",
    });

    const newSession = await res.json();

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setSidebarOpen(false); // close on mobile
  };

  /* ================= LOAD MESSAGES ================= */
  const loadMessages = async (id) => {
    const res = await fetch(`${API_URL}/sessions/${id}`);
    const data = await res.json();
    setCurrentSessionId(id);
    setMessages(data);
    setSidebarOpen(false); // close on mobile
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!input.trim() || !currentSessionId) return;

    const userText = input;
    setInput("");

    const userMessage = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMessage]);

    if (messages.length === 0) {
      await fetch(`${API_URL}/sessions/${currentSessionId}/rename`, {
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body: userText.slice(0, 30),
      });

      const res = await fetch(`${API_URL}/sessions`);
      const updated = await res.json();
      setSessions(updated);
    }

    const eventSource = new EventSource(
      `${API_URL}/chat/stream/${currentSessionId}?prompt=${encodeURIComponent(
        userText
      )}`
    );

    let aiText = "";
    setIsTyping(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    eventSource.onmessage = (event) => {
      aiText += event.data;

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: aiText,
        };
        return updated;
      });
    };

    eventSource.onerror = () => {
      setIsTyping(false);
      eventSource.close();
    };
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text }}>
      
      {/* ===== OVERLAY (MOBILE) ===== */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
          }}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <div
        style={{
          width: 260,
          background: theme.sidebar,
          padding: 20,
          position: "fixed",
          height: "100%",
          zIndex: 1000,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "0.3s",
        }}
      >
        <button style={styles.newChat} onClick={createSession}>
          + New Chat
        </button>

        <div style={{ marginTop: 20 }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => loadMessages(s.id)}
              style={{
                padding: 10,
                borderRadius: 8,
                marginBottom: 6,
                cursor: "pointer",
                background:
                  currentSessionId === s.id
                    ? darkMode
                      ? "#1f2937"
                      : "#d1d5db"
                    : "transparent",
              }}
            >
              {s.title}
            </div>
          ))}
        </div>
      </div>

      {/* ================= MAIN ================= */}
      <div style={{ flex: 1, marginLeft: 0, display: "flex", flexDirection: "column", width: "100%" }}>
        
        {/* HEADER */}
        <div style={styles.header}>
          <button onClick={() => setSidebarOpen(true)} style={styles.menuBtn}>
            ☰
          </button>

          <h3 style={{ margin: 0 }}>AI SaaS</h3>

          <button onClick={() => setDarkMode(!darkMode)} style={styles.toggle}>
            {darkMode ? "🌞" : "🌙"}
          </button>
        </div>

        {/* CHAT AREA */}
        <div style={styles.chatArea}>
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                  marginBottom: 24,
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {isUser ? "You" : "AI"}
                </span>

                <div
                  style={{
                    maxWidth: "80%",
                    padding: "14px",
                    borderRadius: 12,
                    background: isUser ? "#2563eb" : theme.assistant,
                    color: isUser ? "white" : theme.text,
                  }}
                >
                  {msg.content}

                  {isTyping && index === messages.length - 1 && !isUser && (
                    <span className="cursor">▋</span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}></div>
        </div>

        {/* INPUT */}
        <div style={styles.inputArea}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message..."
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #334155",
              background: theme.inputBg,
              color: theme.text,
            }}
          />
          <button onClick={sendMessage} style={styles.send}>
            Send
          </button>
        </div>
      </div>

      <style>{`
        body { margin: 0; overflow-x: hidden; }
        .cursor {
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0% { opacity: 1 }
          50% { opacity: 0 }
          100% { opacity: 1 }
        }
      `}</style>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  header: {
    padding: "10px 15px",
    borderBottom: "1px solid #334155",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatArea: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
  },
  inputArea: {
    padding: 10,
    display: "flex",
    borderTop: "1px solid #334155",
  },
  send: {
    marginLeft: 10,
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "white",
  },
  newChat: {
    padding: "10px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "white",
    width: "100%",
  },
  toggle: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "none",
  },
  menuBtn: {
    fontSize: 20,
    background: "transparent",
    border: "none",
    color: "inherit",
    cursor: "pointer",
  },
};

export default App;