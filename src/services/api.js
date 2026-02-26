const API = "https://ai-backend-xa12.onrender.com/api/ai";

export const api = {
  getSessions: () =>
    fetch(`${API}/sessions`).then(res => res.json()),

  createSession: () =>
    fetch(`${API}/sessions`, { method: "POST" })
      .then(res => res.json()),

  getMessages: (id) =>
    fetch(`${API}/sessions/${id}`).then(res => res.json()),

  deleteSession: (id) =>
    fetch(`${API}/sessions/${id}`, { method: "DELETE" }),

  renameSession: (id, title) =>
    fetch(`${API}/sessions/${id}/rename`, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: title,
    }),

  streamChat: (sessionId, prompt) =>
    new EventSource(
      `${API}/chat/stream/${sessionId}?prompt=${encodeURIComponent(prompt)}`
    ),
};
