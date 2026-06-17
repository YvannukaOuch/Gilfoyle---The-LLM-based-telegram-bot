import React, { useState } from "react";
import { api } from "../api.js";

const DEFAULT_PROMPT =
  "You are acting as me on Telegram. Keep replies short (1-2 sentences), casual, and match the vibe of whoever you're talking to. Never reveal you are an AI. Never apologize.";

// Deterministic avatar image from picsum — each uid gets a consistent photo
function avatarUrl(uid) {
  const seed = String(uid).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${seed}/80/80`;
}

const AVATAR_COLORS = [
  ["#1e3a5f","#60a5fa"],["#1a3a2a","#4ade80"],["#3b1f47","#c084fc"],
  ["#3a2010","#fb923c"],["#3a1a2a","#f472b6"],["#1a2e3a","#38bdf8"],
];
function avatarColor(uid) {
  let n = 0;
  for (const c of String(uid)) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

// Wallpaper options — Unsplash sourced, static URLs so no API key needed
const WALLPAPERS = [
  { id: "none",   label: "None",      url: null },
  { id: "city",   label: "City",      url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80" },
  { id: "forest", label: "Forest",    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80" },
  { id: "space",  label: "Space",     url: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1600&q=80" },
  { id: "ocean",  label: "Ocean",     url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1600&q=80" },
  { id: "neon",   label: "Neon",      url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&q=80" },
  { id: "mist",   label: "Mist",      url: "https://images.unsplash.com/photo-1482192505345-5852b57a1d37?w=1600&q=80" },
];

function Avatar({ uid, name, lg }) {
  const [err, setErr] = useState(false);
  const [bg, fg] = avatarColor(uid);
  const cls = `u-avatar${lg ? " lg" : ""}`;

  if (!err) {
    return (
      <div className={cls} style={{ background: bg }}>
        <img
          src={avatarUrl(uid)}
          alt={name}
          onError={() => setErr(true)}
        />
      </div>
    );
  }
  return (
    <div className={cls} style={{ background: bg, color: fg }}>
      {initials(name)}
    </div>
  );
}

function UserRow({ uid, user, selected, onSelect, onEdit, onRemove }) {
  return (
    <div className={`user-row ${selected === uid ? "active" : ""}`}>
      <button className="user-row-main" onClick={() => onSelect(uid)}>
        <Avatar uid={uid} name={user.name} />
        <div className="u-info">
          <span className="u-name">{user.name}</span>
          <span className="u-meta">ID {uid} · {user.delay ?? 4}s delay</span>
        </div>
      </button>
      <div className="u-actions">
        <button className="u-btn" title="Edit persona" onClick={() => onEdit(uid)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button className="u-btn danger" title="Remove" onClick={() => onRemove(parseInt(uid, 10))}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function PersonaPanel({ uid, user, onClose, onSaved }) {
  const [name,   setName]   = useState(user.name   || "");
  const [prompt, setPrompt] = useState(user.prompt || DEFAULT_PROMPT);
  const [delay,  setDelay]  = useState(user.delay  ?? 4);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateUser(parseInt(uid, 10), { name, prompt, delay: parseFloat(delay) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="persona-panel">
      <div className="pp-header">
        <div className="pp-title-row">
          <Avatar uid={uid} name={user.name} lg />
          <div>
            <div className="pp-title">Edit persona</div>
            <div className="pp-subtitle">ID {uid}</div>
          </div>
        </div>
        <button className="pp-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="pp-body">
        <div className="pp-row">
          <div className="pp-field half">
            <label className="pp-label">Display name</label>
            <input className="pp-input" value={name} onChange={e => setName(e.target.value)} placeholder="Friend's name" />
          </div>
          <div className="pp-field half">
            <label className="pp-label">Reply delay</label>
            <div className="pp-input-suffix">
              <input className="pp-input" type="number" min="0" step="0.5" value={delay} onChange={e => setDelay(e.target.value)} />
              <span className="pp-suffix">sec</span>
            </div>
          </div>
        </div>
        <div className="pp-field">
          <label className="pp-label">
            Persona prompt
            <span className="pp-label-hint">How the bot behaves with this person</span>
          </label>
          <textarea className="pp-textarea" value={prompt} onChange={e => setPrompt(e.target.value)} rows={10} spellCheck={false} />
          <div className="pp-char-count">{prompt.length} chars</div>
        </div>
      </div>

      <div className="pp-footer">
        <button className="pp-cancel" onClick={onClose}>Discard</button>
        <button className="pp-save" onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function WallpaperPicker({ current, onChange, onClose }) {
  return (
    <div className="wp-panel">
      <div className="wp-panel-title">Wallpaper</div>
      <div className="wp-grid">
        {WALLPAPERS.map(wp => (
          wp.id === "none"
            ? <div
                key="none"
                className={`wp-option none ${current === null ? "active" : ""}`}
                onClick={() => { onChange(null); onClose(); }}
              >None</div>
            : <div
                key={wp.id}
                className={`wp-option ${current === wp.url ? "active" : ""}`}
                style={{ backgroundImage: `url(${wp.url})` }}
                title={wp.label}
                onClick={() => { onChange(wp.url); onClose(); }}
              />
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ users, selected, onSelect, onAdd, onRemove, wallpaper, onWallpaper }) {
  const [id,   setId]   = useState("");
  const [name, setName] = useState("");
  const [editUid,    setEditUid]    = useState(null);
  const [showWp,     setShowWp]     = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const entries = Object.entries(users);

  const submit = () => {
    const numericId = parseInt(id, 10);
    if (!numericId) return;
    onAdd(numericId, name.trim());
    setId(""); setName("");
  };

  const editingUser = editUid ? users[editUid] : null;

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-label">Tracked users</span>
        </div>

        <div className="add-form">
          <div className="add-row">
            <input className="add-input" type="number" placeholder="Telegram ID"
              value={id} onChange={e => setId(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
            <input className="add-input" type="text" placeholder="Name"
              value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
          </div>
          <button className="btn-track" onClick={submit} disabled={!id}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Track user
          </button>
        </div>

        <div className="sidebar-list">
          <button className={`all-row ${selected === null ? "active" : ""}`} onClick={() => onSelect(null)}>
            <div className="all-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </div>
            <span>All conversations</span>
            <span className="all-count">{entries.length}</span>
          </button>

          <div className="sidebar-divider" />

          {entries.length === 0 ? (
            <div className="sidebar-empty">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.3}}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>No users yet.<br/>Add a Telegram ID above.</span>
            </div>
          ) : (
            entries.map(([uid, user]) => (
              <UserRow key={uid + refreshKey} uid={uid} user={user} selected={selected}
                onSelect={onSelect} onEdit={setEditUid}
                onRemove={id => { onRemove(id); if (editUid === uid) setEditUid(null); }}
              />
            ))
          )}
        </div>

        {/* wallpaper button pinned to bottom */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button className="wp-btn" style={{ width: "100%", height: "32px", borderRadius: "var(--r-sm)", gap: "8px", fontSize: "12px", color: "var(--text-2)" }}
            onClick={() => setShowWp(v => !v)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Wallpaper{wallpaper ? " ●" : ""}
          </button>
        </div>
      </aside>

      {showWp && (
        <WallpaperPicker current={wallpaper} onChange={onWallpaper} onClose={() => setShowWp(false)} />
      )}

      {editingUser && (
        <>
          <div className="pp-backdrop" onClick={() => setEditUid(null)} />
          <PersonaPanel uid={editUid} user={editingUser}
            onClose={() => setEditUid(null)}
            onSaved={() => setRefreshKey(k => k + 1)}
          />
        </>
      )}
    </>
  );
}
