import React, { useState, useEffect, useRef } from "react";

function App() {
  const [messages, setMessages] = useState([
    { role: "ASSISTANT", content: "How can I help you today?" },
  ]);

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const bottomRef = useRef(null);

  // Responsive detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "USER", content: input },
      {
        role: "ASSISTANT",
        content: "This is a demo response. Connect your backend here.",
      },
    ]);

    setInput("");
  };

  return (
    <div style={styles.app}>
      {/* Overlay (Mobile) */}
      {isMobile && sidebarOpen && (
        <div
          style={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          ...styles.sidebar,
          left: isMobile ? (sidebarOpen ? 0 : -260) : 0,
        }}
      >
        <button style={styles.newChatBtn}>+ New Chat</button>

        <div style={styles.chatList}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={styles.chatItem}>
              New Chat
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div
        style={{
          ...styles.chatWrapper,
          marginLeft: isMobile ? 0 : 260,
        }}
      >
        {/* Top Bar */}
        <div style={styles.topBar}>
          {isMobile && (
            <button
              style={styles.menuButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={styles.messagesContainer}>
          <div style={styles.messages}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={
                  msg.role === "USER"
                    ? styles.userWrapper
                    : styles.botWrapper
                }
              >
                <div
                  style={
                    msg.role === "USER"
                      ? styles.userMessage
                      : styles.botMessage
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div style={styles.inputArea}>
          <div style={styles.inputWrapper}>
            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message ChatGPT..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button style={styles.sendButton} onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#0f172a",
    color: "white",
    fontFamily: "Arial, sans-serif",
  },

  sidebar: {
    width: 260,
    background: "#111827",
    padding: 15,
    position: "fixed",
    top: 0,
    bottom: 0,
    transition: "left 0.3s ease",
    zIndex: 1000,
    overflowY: "auto",
  },

  newChatBtn: {
    width: "100%",
    padding: 10,
    marginBottom: 15,
    background: "#2563eb",
    border: "none",
    borderRadius: 8,
    color: "white",
    cursor: "pointer",
  },

  chatList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  chatItem: {
    padding: 10,
    background: "#1f2937",
    borderRadius: 6,
    cursor: "pointer",
  },

  chatWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },

  topBar: {
    height: 50,
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    borderBottom: "1px solid #1f2937",
  },

  menuButton: {
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: 22,
    cursor: "pointer",
  },

  messagesContainer: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    overflowY: "auto",
  },

  messages: {
    width: "100%",
    maxWidth: 768,
    padding: 20,
    display: "flex",
    flexDirection: "column",
  },

  userWrapper: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 12,
  },

  botWrapper: {
    display: "flex",
    justifyContent: "flex-start",
    marginBottom: 12,
  },

  userMessage: {
    background: "#2563eb",
    padding: "10px 14px",
    borderRadius: 12,
    maxWidth: "70%",
  },

  botMessage: {
    background: "#1f2937",
    padding: "10px 14px",
    borderRadius: 12,
    maxWidth: "70%",
  },

  inputArea: {
    padding: 20,
    borderTop: "1px solid #1f2937",
    display: "flex",
    justifyContent: "center",
  },

  inputWrapper: {
    display: "flex",
    width: "100%",
    maxWidth: 768,
  },

  input: {
    flex: 1,
    padding: 12,
    background: "#1f2937",
    border: "none",
    borderRadius: 8,
    color: "white",
  },

  sendButton: {
    marginLeft: 10,
    padding: "12px 18px",
    background: "#2563eb",
    border: "none",
    borderRadius: 8,
    color: "white",
    cursor: "pointer",
  },

  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 999,
  },
};

export default App;
