# Gilfoyle

A self-hosted Telegram auto-reply bot powered by a **local LLM** (LM Studio), with a **FastAPI** backend and a **React** dashboard. Add friends by their Telegram user ID, give each one a custom persona and reply delay, watch conversations stream live, and toggle the bot on/off — all from the UI.

> **Note:** This is a Telegram *userbot* — it logs into your personal account and replies on your behalf. Use responsibly.

---

## Features

- 🔐 **In-browser login** — enter your API credentials and phone number directly in the UI. No terminal needed after first setup.
- 👤 **Per-user personas** — each tracked user gets their own system prompt and reply delay, editable live.
- 📡 **Live feed** — conversations stream in real-time over WebSocket.
- 🖼️ **Wallpapers** — pick a background for the conversation feed.
- 💾 **No database** — state persists as plain JSON files. Easy to inspect, easy to reset.

---

## Stack

| Layer | Tech |
|---|---|
| Bot + API | Python · FastAPI · Telethon · nest_asyncio |
| LLM | LM Studio (OpenAI-compatible local server) |
| Frontend | React · Vite |
| Transport | WebSocket (live feed) + REST |

---

## Project structure

```
backend/
  main.py          Everything: FastAPI app, Telethon bot, state, WebSocket hub
  login.py         Optional headless login (for server deployments)
  requirements.txt
frontend/
  src/
    App.jsx
    api.js
    components/
      Conversation.jsx
      Login.jsx
      Sidebar.jsx
      StatusBar.jsx
  public/
    gilfoyle_icon.png   App icon (circular crop)
    favicon.png         Browser tab icon
```

---

## Setup

### 1. Get Telegram API credentials

Go to [my.telegram.org](https://my.telegram.org), log in, and create an app. You'll get an **API ID** and **API Hash** — you'll enter these in the login screen, not in any config file.

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env    # Windows
# cp .env.example .env    # macOS/Linux
```

The `.env` only needs non-sensitive config (LLM URL, session name). No credentials go in there.

Start the server:

```bash
python main.py
```

Make sure **LM Studio** is running with its local server enabled (`http://localhost:1234/v1` by default).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the login screen will appear on first run.

---

## First login

1. Enter your **API ID**, **API Hash**, and **phone number**
2. Enter the code Telegram sends to your app
3. Enter your 2FA password if enabled

After login the session is saved — you won't be asked again until it expires.

---

## Adding users

1. Get the person's Telegram **numeric user ID** — forward one of their messages to [@userinfobot](https://t.me/userinfobot)
2. Enter the ID in the sidebar and click **Track user**
3. Click ⚙ on their row to set a custom persona prompt and reply delay

---

## Security

- `.env` and `*.session` files are gitignored — never commit them
- `data/` (whitelist, messages, credentials) is also gitignored
- If your API Hash was ever exposed publicly, rotate it at [my.telegram.org](https://my.telegram.org)

---

## License

MIT
