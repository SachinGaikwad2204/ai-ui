import React, { useEffect, useState, useCallback } from "react";

const API_URL = "https://ai-backend-xa12.onrender.com/api/ai";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const theme = darkMode
    ? {
        bg: "#0f172a",
        text: "white",
        sidebar: "#111827",
        inputBg: "#1f2937",
      }
    : {
        bg: "#f3f4f6",
        text: "black",
        sidebar: "#e5e7eb",
        inputBg: "white",
      };

  /* =========================
     LOAD SESSIONS ON START
  ========================== */
const fetchSessions = useCallback(async () => {
  const res = await fetch(`${API_URL}/sessions`);
  const data = await res.json();

  if (data.length === 0) {
    await createSession();
    return;
  }

  setSessions(data);
  setCurrentSessionId(data[0].id);
  loadMessages(data[0].id);
}, []);







  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /* =========================
     CREATE SESSION
  ========================== */
  const createSession = async () => {
    const res = await fetch(`${API_URL}/sessions`, {
      method: "POST",
    });

    const newSession = await res.json();
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  /* =========================
     LOAD MESSAGES
  ========================== */
  const loadMessages = async (id) => {
    const res = await fetch(`${API_URL}/sessions/${id}`);
    const data = await res.json();
    setCurrentSessionId(id);
    setMessages(data);
  };

  /* =========================
     SEND MESSAGE (STREAMING)
  ========================== */
  const sendMessage = async () => {
    if (!input.trim()) return;

    let sessionId = currentSessionId;

    if (!sessionId) {
      await createSession();
      return;
    }

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Auto title from first message
    if (messages.length === 0) {
      renameSessionAuto(sessionId, input.slice(0, 20));
    }

    const eventSource = new EventSource(
      `${API_URL}/chat/stream/${sessionId}?prompt=${encodeURIComponent(
        input
      )}`
    );

    let aiText = "";
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
      eventSource.close();
    };
  };

  /* =========================
     DELETE SESSION
  ========================== */
  const deleteSession = async (id) => {
    await fetch(`${API_URL}/sessions/${id}`, {
      method: "DELETE",
    });

    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);

    if (updated.length > 0) {
      setCurrentSessionId(updated[0].id);
      loadMessages(updated[0].id);
    } else {
      setMessages([]);
      setCurrentSessionId(null);
    }
  };

  /* =========================
     RENAME SESSION
  ========================== */
  const renameSession = async (id) => {
    await fetch(`${API_URL}/sessions/${id}/rename`, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: editTitle,
    });

    setEditingId(null);
    fetchSessions();
  };

  const renameSessionAuto = async (id, title) => {
    await fetch(`${API_URL}/sessions/${id}/rename`, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: title,
    });

    fetchSessions();
  };

  /* =========================
     UI
  ========================== */

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text }}>
      {/* SIDEBAR */}
      <div style={{ width: 260, background: theme.sidebar, padding: 15 }}>
        <button style={btn} onClick={createSession}>
          + New Chat
        </button>

        <div style={{ marginTop: 20 }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ marginBottom: 10 }}>
              {editingId === s.id ? (
                <div>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ width: "100%", padding: 6 }}
                  />
                  <button onClick={() => renameSession(s.id)}>Save</button>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span
                    onClick={() => loadMessages(s.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {s.title}
                  </span>
                  <div>
                    <span
                      onClick={() => {
                        setEditingId(s.id);
                        setEditTitle(s.title);
                      }}
                      style={{ cursor: "pointer", marginRight: 8 }}
                    >
                      ✏
                    </span>
                    <span
                      onClick={() => deleteSession(s.id)}
                      style={{ cursor: "pointer", color: "red" }}
                    >
                      🗑
                    </span>
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

        {/* MESSAGES */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                textAlign: msg.role === "user" ? "right" : "left",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  padding: 10,
                  borderRadius: 8,
                  display: "inline-block",
                  background:
                    msg.role === "user" ? "#2563eb" : theme.inputBg,
                  color: msg.role === "user" ? "white" : theme.text,
                }}
              >
                {msg.content}
              </span>
            </div>
          ))}
        </div>

        {/* INPUT */}
        <div style={{ padding: 15, display: "flex" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message..."
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ccc",
              background: theme.inputBg,
              color: theme.text,
            }}
          />
          <button onClick={sendMessage} style={btn}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const btn = {
  marginLeft: 10,
  padding: "12px 20px",
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
};

export default App;
