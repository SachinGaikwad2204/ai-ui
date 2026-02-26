import React, { useEffect, useState, useRef } from "react";

const API_URL = "https://ai-backend-xa12.onrender.com/api/ai";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

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

  /* ===============================
     AUTO SCROLL
  =============================== */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ===============================
     LOAD SESSIONS ON START
  =============================== */
  useEffect(() => {
    const loadInitialData = async () => {
      const res = await fetch(`${API_URL}/sessions`);
      const data = await res.json();

      if (data.length === 0) {
        const newRes = await fetch(`${API_URL}/sessions`, {
          method: "POST",
        });
        const newSession = await newRes.json();
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
        return;
      }

      setSessions(data);
      setCurrentSessionId(data[0].id);

      const msgRes = await fetch(
        `${API_URL}/sessions/${data[0].id}`
      );
      const msgs = await msgRes.json();
      setMessages(msgs);
    };

    loadInitialData();
  }, []);

  const createSession = async () => {
    const res = await fetch(`${API_URL}/sessions`, {
      method: "POST",
    });

    const newSession = await res.json();

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const loadMessages = async (id) => {
    const res = await fetch(`${API_URL}/sessions/${id}`);
    const data = await res.json();
    setCurrentSessionId(id);
    setMessages(data);
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentSessionId) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const eventSource = new EventSource(
      `${API_URL}/chat/stream/${currentSessionId}?prompt=${encodeURIComponent(
        input
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

      {/* SIDEBAR */}
      <div style={{
        width: 260,
        background: theme.sidebar,
        padding: 20,
      }}>
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
                transition: "0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  darkMode ? "#1f2937" : "#d1d5db")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {s.title}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* HEADER */}
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>AI SaaS</h3>
          <button onClick={() => setDarkMode(!darkMode)} style={styles.toggle}>
            {darkMode ? "🌞 Light" : "🌙 Dark"}
          </button>
        </div>

        {/* CHAT AREA */}
        <div style={styles.chatArea}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent:
                  msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "14px 18px",
                  borderRadius: 14,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                  fontSize: 15,
                  background:
                    msg.role === "user"
                      ? "#2563eb"
                      : theme.assistant,
                  color:
                    msg.role === "user"
                      ? "white"
                      : theme.text,
                }}
              >
                {msg.content}
                {isTyping && index === messages.length - 1 && msg.role === "assistant" && (
                  <span className="cursor">▋</span>
                )}
              </div>
            </div>
          ))}
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
              padding: 14,
              borderRadius: 10,
              border: "1px solid #334155",
              background: theme.inputBg,
              color: theme.text,
              fontSize: 15,
            }}
          />
          <button onClick={sendMessage} style={styles.send}>
            Send
          </button>
        </div>
      </div>

      <style>{`
        .cursor {
          animation: blink 1s infinite;
          margin-left: 2px;
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

const styles = {
  header: {
    padding: "14px 20px",
    borderBottom: "1px solid #334155",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatArea: {
    flex: 1,
    padding: "30px 80px",
    overflowY: "auto",
  },
  inputArea: {
    padding: 20,
    display: "flex",
    borderTop: "1px solid #334155",
  },
  send: {
    marginLeft: 10,
    padding: "14px 22px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },
  newChat: {
    padding: "12px 18px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    width: "100%",
  },
  toggle: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
  },
};

export default App;
