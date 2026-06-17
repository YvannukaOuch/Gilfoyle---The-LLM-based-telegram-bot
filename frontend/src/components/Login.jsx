import React, { useState } from "react";
import { api } from "../api.js";

const STEPS = ["creds", "code", "password"];

export default function Login({ onAuthed }) {
  const [step,     setStep]     = useState("creds");
  const [apiId,    setApiId]    = useState("");
  const [apiHash,  setApiHash]  = useState("");
  const [phone,    setPhone]    = useState("");
  const [code,     setCode]     = useState("");
  const [password, setPassword] = useState("");
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState("");

  const run = async (fn) => {
    setError(""); setBusy(true);
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const stepIdx = STEPS.indexOf(step);

  const sendCode       = () => run(async () => { await api.sendCode(parseInt(apiId,10), apiHash.trim(), phone.trim()); setStep("code"); });
  const signIn         = () => run(async () => { const r = await api.signIn(code.trim()); if (r.needs_password) setStep("password"); else onAuthed(); });
  const submitPassword = () => run(async () => { await api.authPassword(password); onAuthed(); });

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-avatar lg"><img src="/gilfoyle_icon.png" alt="Gilfoyle" /></div>
          <span className="brand-name">Gilfoyle</span>
        </div>

        <div className="login-step-indicator">
          {STEPS.map((s, i) => (
            <div key={s} className={`step-pip ${i <= stepIdx ? "done" : ""}`} />
          ))}
        </div>

        {step === "creds" && (
          <>
            <div className="login-step-label">Credentials</div>
            <p className="login-hint">
              Get your API credentials from{" "}
              <a href="https://my.telegram.org" target="_blank" rel="noreferrer">my.telegram.org</a>.
            </p>
            <div className="login-field">
              <label className="login-field-label">API ID</label>
              <input className="login-input" type="number" placeholder="12345678" value={apiId} onChange={(e) => setApiId(e.target.value)} autoFocus />
            </div>
            <div className="login-field">
              <label className="login-field-label">API Hash</label>
              <input className="login-input" type="text" placeholder="a1b2c3d4e5f6…" value={apiHash} onChange={(e) => setApiHash(e.target.value)} />
            </div>
            <div className="login-field">
              <label className="login-field-label">Phone number</label>
              <input className="login-input" type="tel" placeholder="+85512345678" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendCode()} />
            </div>
            <button className="btn-primary" disabled={busy || !apiId || !apiHash || !phone} onClick={sendCode}>
              {busy ? "Sending code…" : "Send code →"}
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <div className="login-step-label">Verification</div>
            <p className="login-hint">Telegram sent a code to your app. Enter it below.</p>
            <div className="login-field">
              <label className="login-field-label">Login code</label>
              <input className="login-input" type="text" inputMode="numeric" placeholder="12345" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && signIn()} autoFocus />
            </div>
            <button className="btn-primary" disabled={busy || !code} onClick={signIn}>
              {busy ? "Verifying…" : "Sign in →"}
            </button>
            <button className="btn-ghost" onClick={() => setStep("creds")}>← Change number</button>
          </>
        )}

        {step === "password" && (
          <>
            <div className="login-step-label">Two-step verification</div>
            <p className="login-hint">This account has a password set. Enter it to continue.</p>
            <div className="login-field">
              <label className="login-field-label">Password</label>
              <input className="login-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPassword()} autoFocus />
            </div>
            <button className="btn-primary" disabled={busy || !password} onClick={submitPassword}>
              {busy ? "Checking…" : "Unlock →"}
            </button>
          </>
        )}

        {error && <div className="login-error">{error}</div>}
      </div>
    </div>
  );
}
