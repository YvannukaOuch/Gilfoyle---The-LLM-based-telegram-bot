// Tiny wrapper around fetch. URLs are relative because Vite proxies /api to
// the backend in dev (see vite.config.js).

async function json(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.detail) || res.statusText);
  return data;
}

export const api = {
  // --- auth ---
  authStatus: () => fetch("/api/auth/status").then(json),
  sendCode: (api_id, api_hash, phone) =>
    fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_id, api_hash, phone }),
    }).then(json),
  signIn: (code) =>
    fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).then(json),
  authPassword: (password) =>
    fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).then(json),

  getStatus: () => fetch("/api/status").then(json),

  setActive: (active) =>
    fetch("/api/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    }).then(json),


  getUsers: () => fetch("/api/users").then(json),

  addUser: (user_id, name) =>
    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, name }),
    }).then(json),

  updateUser: (user_id, data) =>
    fetch(`/api/users/${user_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(json),

  removeUser: (user_id) =>
    fetch(`/api/users/${user_id}`, { method: "DELETE" }).then(json),

  getMessages: () => fetch("/api/messages").then(json),
};
