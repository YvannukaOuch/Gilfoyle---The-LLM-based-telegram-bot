import React from "react";

export default function StatusBar({ active, connected, onToggleActive }) {
  return (
    <header className="statusbar">
      <div className="brand">
        <div className="brand-avatar">
          <img src="/gilfoyle_icon.png" alt="Gilfoyle" />
        </div>
        <span className="brand-name">Gilfoyle</span>
      </div>
      <div className="status-controls">
        <div className="status-pill">
          <span className={`dot ${connected ? "on" : "off"}`} />
          {connected ? "Live" : "Offline"}
        </div>
        <button
          className={`toggle ${active ? "active" : ""}`}
          onClick={() => onToggleActive(!active)}
        >
          {active ? "Bot ON" : "Bot OFF"}
        </button>
      </div>
    </header>
  );
}
