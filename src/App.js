import React, { useState, useEffect, useRef } from "react";

function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    const handleResize = () =>
      setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      {
        role: "assistant",
        content:
          "This is a demo response. Connect your backend here.",
      },
    ]);

    setInput("");
  };

  return (
    <div style={styles.app}>
      {/* Mobile Overlay */}
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
          left: isMobile
            ? sidebarOpen ? 0 : -260
            : 0,
        }}
      >
        <button style={styles.newChat}>
          + New Chat
        </button>

        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={styles.chatItem}>
            New Chat
          </div>
        ))}
      </div>

      {/* Main Chat Section */}
      <div
        style={{
          ...styles.chatSection,
          marginLeft: isMobile ? 0 : 260,
        }}
      >
        {/* Top bar */}
        <div style={styles.topBar}>
          {isMobile && (
            <button
              style={styles.menu}
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
            >
              ☰
            </button>
          )}
        </div>

        {/* Chat Body */}
        <div style={styles.chatBody}>
          <div style={styles.chatContainer}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={
                  msg.role === "user"
                    ? styles.userRow
                    : styles.botRow
                }
              >
                <div
                  style={
                    msg.role === "user"
                      ? styles.userBubble
                      : styles.botBubble
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area */}
        <div style={styles.inputSection}>
          <div style={styles.inputWrapper}>
            <input
              style={styles.input}
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              placeholder="Message ChatGPT..."
              onKeyDown={(e) =>
                e.key === "Enter" && sendMessage()
              }
            />
            <button
              style={styles.sendBtn}
              onClick={sendMessage}
            >
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
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },

  sidebar: {
    width: 260,
    background: "#111827",
    padding: 15,
    position: "fixed",
    top: 0,
    bottom: 0,
    transition: "left 0.3s ease",
    overflowY: "auto",
    zIndex: 1000,
  },

  newChat: {
    width: "100%",
    padding: 10,
    marginBottom: 15,
    background: "#2563eb",
    border: "none",
    borderRadius: 8,
    color: "white",
    cursor: "pointer",
  },

  chatItem: {
    padding: 10,
    background: "#1f2937",
    borderRadius: 6,
    marginBottom: 10,
    cursor: "pointer",
  },

  chatSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  topBar: {
    height: 50,
    borderBottom: "1px solid #1f2937",
    display: "flex",
    alignItems: "center",
    paddingLeft: 15,
  },

  menu: {
    background: "transparent",
    border: "none",
    fontSize: 22,
    color: "white",
    cursor: "pointer",
  },

  chatBody: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    justifyContent: "center",
  },

  chatContainer: {
    width: "100%",
    maxWidth: 800,
    padding: "30px 20px",
  },

  userRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 20,
  },

  botRow: {
    display: "flex",
    justifyContent: "flex-start",
    marginBottom: 20,
  },

  userBubble: {
    background: "#2563eb",
    padding: "12px 16px",
    borderRadius: 12,
    maxWidth: "70%",
  },

  botBubble: {
    background: "#1f2937",
    padding: "12px 16px",
    borderRadius: 12,
    maxWidth: "70%",
  },

  inputSection: {
    borderTop: "1px solid #1f2937",
    padding: 20,
    display: "flex",
    justifyContent: "center",
  },

  inputWrapper: {
    display: "flex",
    width: "100%",
    maxWidth: 800,
  },

  input: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    border: "none",
    background: "#1f2937",
    color: "white",
  },

  sendBtn: {
    marginLeft: 10,
    padding: "14px 20px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },

  overlay: {
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 999,
  },
};

export default App;
