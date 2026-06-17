import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import Login from "./components/Login.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Conversation from "./components/Conversation.jsx";
import StatusBar from "./components/StatusBar.jsx";

export default function App() {
  const [authed,    setAuthed]    = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [users,     setUsers]     = useState({});
  const [selected,  setSelected]  = useState(null);
  const [active,    setActive]    = useState(true);
  const [connected, setConnected] = useState(false);
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem("wallpaper") || null);

  useEffect(() => {
    api.authStatus().then(r => setAuthed(r.authorized)).catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    api.getStatus().then(s => setActive(s.active));
    api.getUsers().then(setUsers);
    api.getMessages().then(setMessages);

    let ws, retry;
    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onopen  = () => setConnected(true);
      ws.onclose = () => { setConnected(false); retry = setTimeout(connect, 2000); };
      ws.onmessage = e => {
        const { type, data } = JSON.parse(e.data);
        if      (type === "backlog")   setMessages(data);
        else if (type === "message")   setMessages(prev => [...prev, data]);
        else if (type === "whitelist") setUsers(data);
      };
    };
    connect();
    return () => { clearTimeout(retry); ws && ws.close(); };
  }, [authed]);

  const visibleMessages = useMemo(
    () => selected === null ? messages : messages.filter(m => m.user_id === selected),
    [messages, selected]
  );

  const handleAdd    = (id, name) => api.addUser(id, name).then(setUsers);
  const handleRemove = id => { api.removeUser(id).then(setUsers); if (String(id) === selected) setSelected(null); };
  const handleToggle = val => api.setActive(val).then(r => setActive(r.active));
  const handleWallpaper = url => {
    setWallpaper(url);
    if (url) localStorage.setItem("wallpaper", url);
    else localStorage.removeItem("wallpaper");
  };

  if (authed === null) return <div className="login-screen">Loading…</div>;
  if (!authed)         return <Login onAuthed={() => setAuthed(true)} />;

  return (
    <div className="app">
      <StatusBar active={active} connected={connected} onToggleActive={handleToggle} />
      <div className="body">
        <Sidebar
          users={users} selected={selected}
          onSelect={setSelected} onAdd={handleAdd} onRemove={handleRemove}
          wallpaper={wallpaper} onWallpaper={handleWallpaper}
        />
        <main className="main">
          <Conversation
            messages={visibleMessages} showUser={selected === null}
            selectedUser={selected} users={users} wallpaper={wallpaper}
          />
        </main>
      </div>
    </div>
  );
}
