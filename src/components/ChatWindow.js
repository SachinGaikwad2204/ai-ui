import React, { useRef, useEffect } from "react";

export default function ChatWindow({ messages, theme }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      {messages.map((msg, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent:
              msg.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 15,
          }}
        >
          <div
            style={{
              background:
                msg.role === "user"
                  ? "#2563eb"
                  : theme.chatBubble,
              padding: 12,
              borderRadius: 10,
              maxWidth: "70%",
            }}
          >
            {msg.content}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
