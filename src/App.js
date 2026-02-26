import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "https://ai-backend-xa12.onrender.com/api/ai";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const newChat = () => {
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "USER", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const messageText = input;
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: messageText,
      });

      const text = await res.text();
      const aiMsg = { role: "AI", content: text };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "AI", content: "⚠️ Server error. Please try again." },
      ]);
    }

    setLoading(false);
  };

  return (
    <div style={styles.app}>
      
      {/* HEADER */}
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>AI Chat</h2>
        <button onClick={newChat} style={styles.newChatBtn}>
          + New Chat
        </button>
      </div>

      {/* CHAT AREA */}
      <div style={styles.chatContainer}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <h3>Start a Conversation 🚀</h3>
            <p>Ask anything to your AI assistant.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.messageWrapper,
              justifyContent:
                msg.role === "USER" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                ...styles.message,
                background:
                  msg.role === "USER" ? "#2563eb" : "#1f2937",
              }}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}

        {loading && (
          <div style={styles.loading}>AI is typing...</div>
        )}

        <div ref={bottomRef}></div>
      </div>

      {/* INPUT AREA */}
      <div style={styles.inputArea}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          style={styles.input}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} style={styles.sendBtn}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#0f172a",
    color: "white",
    fontFamily: "sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 25px",
    background: "#111827",
    borderBottom: "1px solid #1f2937",
  },
  newChatBtn: {
    padding: "8px 14px",
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    color: "white",
    cursor: "pointer",
  },
  chatContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
  },
  messageWrapper: {
    display: "flex",
    marginBottom: 15,
  },
  message: {
    padding: 12,
    borderRadius: 10,
    maxWidth: "60%",
    fontSize: 14,
  },
  loading: {
    marginTop: 10,
    opacity: 0.7,
  },
  inputArea: {
    display: "flex",
    padding: 15,
    borderTop: "1px solid #1f2937",
    background: "#111827",
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    border: "none",
    outline: "none",
  },
  sendBtn: {
    marginLeft: 10,
    padding: "12px 20px",
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    color: "white",
    cursor: "pointer",
  },
  emptyState: {
    textAlign: "center",
    marginTop: "20%",
    opacity: 0.6,
  },
};

export default App;
