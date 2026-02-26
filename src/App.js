import React, { useState, useEffect } from "react";
import ChatWindow from "./components/ChatWindow";
import { api } from "./services/api";

function App() {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const data = await api.getSessions();
    setSessions(data);
  };

  const createSession = async () => {
    const data = await api.createSession();
    setSessionId(data.id);
    setMessages([]);
    loadSessions();
  };

  const loadMessages = async (id) => {
    const data = await api.getMessages(id);

    const formatted = data.map((m) => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }));

    setMessages(formatted);
    setSessionId(id);
  };

  const deleteSession = async (id) => {
    await api.deleteSession(id);
    if (id === sessionId) {
      setMessages([]);
      setSessionId(null);
    }
    loadSessions();
  };

  const renameSession = async (id) => {
    await api.renameSession(id, editTitle);
    setEditingId(null);
    loadSessions();
  };

  /* ================= STREAMING ================= */

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage = input;
    setInput("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);

    // AUTO TITLE if first message
    if (messages.length === 0) {
      await api.renameSession(sessionId, userMessage.slice(0, 30));
      loadSessions();
    }

    const eventSource = api.streamChat(sessionId, userMessage);

    let assistantMessage = "";

    eventSource.onmessage = (event) => {
      assistantMessage += event.data;

      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === "assistant") {
          updated[updated.length - 1].content = assistantMessage;
        } else {
          updated.push({
            role: "assistant",
            content: assistantMessage,
          });
        }
        return [...updated];
      });
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
  };

  const theme = {
    bg: darkMode ? "#0f172a" : "#f3f4f6",
    sidebar: darkMode ? "#111827" : "#e5e7eb",
    text: darkMode ? "white" : "black",
    chatBubble: darkMode ? "#1f2937" : "white",
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text }}>
  
    
      {/* SIDEBAR */}
      <div style={{ width: 260, background: theme.sidebar, padding: 15 }}>
        <button style={btn} onClick={createSession}>+ New Chat</button>

        <div style={{ marginTop: 20 }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ marginBottom: 10 }}>
              
              {editingId === s.id ? (
                <div>



<input
  value={editTitle}
  onChange={(e) => setEditTitle(e.target.value)}
  style={{
    width: "100%",
    padding: 6,
    borderRadius: 6,
    border: darkMode ? "1px solid #334155" : "1px solid #ccc",
    background: darkMode ? "#1f2937" : "white",
    color: darkMode ? "white" : "black",
    outline: "none",
  }}
/>



                  <button onClick={() => renameSession(s.id)}>✔</button>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
  

<span
  onClick={() => loadMessages(s.id)}
  style={{ cursor: "pointer", color: theme.text }}
>
  {s.title}
</span>



                  <div>
                    <span onClick={() => {
                      setEditingId(s.id);
                      setEditTitle(s.title);
                    }} style={{ cursor: "pointer", marginRight: 8 }}>✏</span>
                    <span onClick={() => deleteSession(s.id)} style={{ cursor: "pointer", color: "red" }}>🗑</span>
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* TOP */}
        <div style={{ padding: 10, borderBottom: "1px solid gray", display: "flex", justifyContent: "space-between" }}>
          <h3>AI SaaS</h3>
          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "🌞 Light" : "🌙 Dark"}
          </button>
        </div>

        <ChatWindow messages={messages} theme={theme} />

        {/* INPUT */}
<input
  value={input}
  onChange={(e) => setInput(e.target.value)}
  placeholder="Message..."
  style={{
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: darkMode ? "1px solid #334155" : "1px solid #ccc",
    background: darkMode ? "#1f2937" : "white",
    color: darkMode ? "white" : "black",
    outline: "none"
  }}
  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
/>

            <button onClick={sendMessage} style={btn}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const btn = {
  padding: 10,
  border: "none",
  borderRadius: 6,
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
};

export default App;
