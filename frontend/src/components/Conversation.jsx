import React, { useEffect, useRef } from "react";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Insert date dividers between messages from different days.
function withDividers(messages) {
  const out = [];
  let lastDate = null;
  for (const m of messages) {
    const d = new Date(m.ts).toDateString();
    if (d !== lastDate) {
      out.push({ type: "divider", label: formatDate(m.ts), key: `div-${m.ts}` });
      lastDate = d;
    }
    out.push({ type: "message", ...m });
  }
  return out;
}

export default function Conversation({ messages, showUser, selectedUser, users, wallpaper }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const title = selectedUser
    ? (users[selectedUser]?.name || selectedUser)
    : "All conversations";

  const count = messages.length;

  if (messages.length === 0) {
    return (
      <>
        <div className="feed-header">
          <span className="feed-header-title">{title}</span>
        </div>
        <div className="feed empty-feed">
          <div className="empty-feed-icon">💬</div>
          <div className="empty-feed-text">Waiting for messages…</div>
        </div>
      </>
    );
  }

  const items = withDividers(messages);

  return (
    <>
      <div className="feed-header">
        <span className="feed-header-title">{title}</span>
        <span className="feed-header-sub">{count} message{count !== 1 ? "s" : ""}</span>
      </div>
      <div className={`feed${wallpaper ? " feed-bg" : ""}`} style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : {}}>
        {items.map((item) =>
          item.type === "divider" ? (
            <div key={item.key} className="date-divider">{item.label}</div>
          ) : (
            <div key={item.id} className={`bubble-row ${item.direction}`}>
              <div className={`bubble ${item.direction}`}>
                <div className="bubble-bar" />
                <div className="bubble-body">
                  {showUser && item.direction === "in" && (
                    <div className="bubble-author">{item.user_name} · {item.user_id}</div>
                  )}
                  <div className="bubble-text">{item.text}</div>
                  <div className="bubble-time">{formatTime(item.ts)}</div>
                </div>
              </div>
            </div>
          )
        )}
        <div ref={endRef} />
      </div>
    </>
  );
}
