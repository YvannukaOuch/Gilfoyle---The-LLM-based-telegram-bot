"""
Same async pattern as the original notebook — one event loop shared by
Telethon, the LLM client, and FastAPI. nest_asyncio lets them all coexist.

Run with:
    python main.py
"""
import asyncio
import json
import os
import time

import nest_asyncio
import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from pydantic import BaseModel
from telethon import TelegramClient, events, errors
from typing import Optional

nest_asyncio.apply()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
from dotenv import load_dotenv
load_dotenv()

SESSION_NAME    = os.getenv("TG_SESSION_NAME", "user_session")
LLM_BASE_URL    = os.getenv("LLM_BASE_URL", "http://localhost:1234/v1")
LLM_MODEL       = os.getenv("LLM_MODEL", "local-model")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "1.1"))
DATA_DIR        = os.getenv("DATA_DIR", "data")
CORS_ORIGINS    = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

DEFAULT_PROMPT = (
    "You are acting as me on Telegram. Keep replies short (1-2 sentences), casual, and match the vibe of whoever you're talking to. Never reveal you are an AI. Never apologize."
)
DEFAULT_DELAY = 4.0

os.makedirs(DATA_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# State helpers
# ---------------------------------------------------------------------------
def _read(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default

def _write(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

CREDS_FILE    = os.path.join(DATA_DIR, "credentials.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")
USERS_FILE    = os.path.join(DATA_DIR, "whitelist.json")
MSGS_FILE     = os.path.join(DATA_DIR, "messages.json")

_settings = _read(SETTINGS_FILE, {"active": True})
_creds    = _read(CREDS_FILE, None)
_messages = _read(MSGS_FILE, [])

# Whitelist structure:
# { "uid": { "name": str, "prompt": str, "delay": float } }
_whitelist = _read(USERS_FILE, {})

def _save_settings(): _write(SETTINGS_FILE, _settings)
def _save_whitelist(): _write(USERS_FILE, _whitelist)
def _save_messages():  _write(MSGS_FILE, _messages[-500:])
def _save_creds():     _write(CREDS_FILE, _creds)

def _user(uid: int) -> Optional[dict]:
    return _whitelist.get(str(uid))

def _user_prompt(uid: int) -> str:
    u = _user(uid)
    return u["prompt"] if u and u.get("prompt") else DEFAULT_PROMPT

def _user_delay(uid: int) -> float:
    u = _user(uid)
    return float(u["delay"]) if u and u.get("delay") is not None else DEFAULT_DELAY

def _add_msg(user_id, user_name, direction, text):
    msg = {
        "id": f"{int(time.time()*1000)}-{direction}",
        "user_id": str(user_id),
        "user_name": user_name,
        "direction": direction,
        "text": text,
        "ts": int(time.time() * 1000),
    }
    _messages.append(msg)
    _save_messages()
    return msg

# ---------------------------------------------------------------------------
# Telegram + LLM
# ---------------------------------------------------------------------------
tg_client: Optional[TelegramClient] = None
local_ai:  Optional[AsyncOpenAI]    = None
_login_state = {}

def _build_client(api_id: int, api_hash: str) -> TelegramClient:
    c = TelegramClient(SESSION_NAME, api_id, api_hash)

    @c.on(events.NewMessage(incoming=True))
    async def responder(event):
        if not event.is_private:
            return
        if not _settings.get("active", True):
            return
        uid = event.sender_id
        if str(uid) not in _whitelist:
            return

        sender = await event.get_sender()
        name = getattr(sender, "first_name", None) or f"User {uid}"

        msg_in = _add_msg(uid, name, "in", event.text)
        await _broadcast("message", msg_in)
        print(f"[{name}]: {event.text}")

        # Per-user delay
        await asyncio.sleep(_user_delay(uid))

        try:
            resp = await local_ai.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": _user_prompt(uid)},
                    {"role": "user",   "content": event.text},
                ],
                temperature=LLM_TEMPERATURE,
            )
            reply = resp.choices[0].message.content
            await event.reply(reply)
            msg_out = _add_msg(uid, name, "out", reply)
            await _broadcast("message", msg_out)
            print(f"[AI → {name}]: {reply}")
        except Exception as e:
            print(f"LM Studio error: {e}")
            await _broadcast("error", {"message": str(e)})

    return c

# ---------------------------------------------------------------------------
# WebSocket hub
# ---------------------------------------------------------------------------
_ws_clients: set = set()

async def _broadcast(event_type: str, payload: dict):
    msg = json.dumps({"type": event_type, "data": payload})
    dead = set()
    for ws in _ws_clients:
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    _ws_clients.difference_update(dead)

# ---------------------------------------------------------------------------
# FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(title="LeBotJames")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Schemas ---
class PhoneBody(BaseModel):
    api_id: int
    api_hash: str
    phone: str

class CodeBody(BaseModel):
    code: str

class PasswordBody(BaseModel):
    password: str

class AddUser(BaseModel):
    user_id: int
    name: Optional[str] = None
    prompt: Optional[str] = None
    delay: Optional[float] = None

class UpdateUser(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None
    delay: Optional[float] = None

class ActiveBody(BaseModel):
    active: bool

# --- Auth ---
@app.get("/api/auth/status")
async def auth_status():
    if tg_client is None:
        return {"authorized": False}
    return {"authorized": await tg_client.is_user_authorized()}

@app.post("/api/auth/send-code")
async def auth_send_code(body: PhoneBody):
    global tg_client, local_ai, _creds
    try:
        _creds = {"api_id": body.api_id, "api_hash": body.api_hash}
        _save_creds()
        local_ai  = AsyncOpenAI(base_url=LLM_BASE_URL, api_key="not-needed")
        tg_client = _build_client(body.api_id, body.api_hash)
        await tg_client.connect()
        sent = await tg_client.send_code_request(body.phone)
        _login_state["phone"] = body.phone
        _login_state["hash"]  = sent.phone_code_hash
        return {"ok": True}
    except errors.PhoneNumberInvalidError:
        raise HTTPException(400, "Invalid phone number.")
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/api/auth/sign-in")
async def auth_sign_in(body: CodeBody):
    try:
        await tg_client.sign_in(
            phone=_login_state["phone"],
            code=body.code,
            phone_code_hash=_login_state["hash"],
        )
        me = await tg_client.get_me()
        print(f"[bot] Logged in as {me.first_name}")
        return {"authorized": True, "needs_password": False}
    except errors.SessionPasswordNeededError:
        return {"authorized": False, "needs_password": True}
    except errors.PhoneCodeInvalidError:
        raise HTTPException(400, "Invalid code.")
    except errors.PhoneCodeExpiredError:
        raise HTTPException(400, "Code expired — request a new one.")
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/api/auth/password")
async def auth_password(body: PasswordBody):
    try:
        await tg_client.sign_in(password=body.password)
        return {"authorized": True}
    except errors.PasswordHashInvalidError:
        raise HTTPException(400, "Wrong 2FA password.")
    except Exception as e:
        raise HTTPException(400, str(e))

# --- Status ---
@app.get("/api/status")
def status():
    return {
        "active": _settings.get("active", True),
        "tracked_count": len(_whitelist),
    }

@app.put("/api/active")
def set_active(body: ActiveBody):
    _settings["active"] = body.active
    _save_settings()
    return {"active": _settings["active"]}

# --- Users ---
@app.get("/api/users")
def list_users():
    return _whitelist

@app.post("/api/users")
async def add_user(body: AddUser):
    name = body.name
    if not name and tg_client:
        try:
            entity = await tg_client.get_entity(body.user_id)
            name = getattr(entity, "first_name", None) or f"User {body.user_id}"
        except Exception:
            name = f"User {body.user_id}"
    _whitelist[str(body.user_id)] = {
        "name":   name or f"User {body.user_id}",
        "prompt": body.prompt or DEFAULT_PROMPT,
        "delay":  body.delay if body.delay is not None else DEFAULT_DELAY,
    }
    _save_whitelist()
    await _broadcast("whitelist", _whitelist)
    return _whitelist

@app.put("/api/users/{user_id}")
async def update_user(user_id: int, body: UpdateUser):
    uid = str(user_id)
    if uid not in _whitelist:
        raise HTTPException(404, "User not found.")
    if body.name   is not None: _whitelist[uid]["name"]   = body.name
    if body.prompt is not None: _whitelist[uid]["prompt"] = body.prompt
    if body.delay  is not None: _whitelist[uid]["delay"]  = body.delay
    _save_whitelist()
    await _broadcast("whitelist", _whitelist)
    return _whitelist

@app.delete("/api/users/{user_id}")
async def remove_user(user_id: int):
    _whitelist.pop(str(user_id), None)
    _save_whitelist()
    await _broadcast("whitelist", _whitelist)
    return _whitelist

# --- Messages ---
@app.get("/api/messages")
def get_messages(user_id: Optional[int] = None):
    if user_id:
        return [m for m in _messages if m["user_id"] == str(user_id)]
    return _messages

# --- WebSocket ---
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    _ws_clients.add(ws)
    try:
        await ws.send_json({"type": "backlog",   "data": _messages})
        await ws.send_json({"type": "whitelist", "data": _whitelist})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        _ws_clients.discard(ws)

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
async def main():
    global tg_client, local_ai

    if _creds:
        local_ai  = AsyncOpenAI(base_url=LLM_BASE_URL, api_key="not-needed")
        tg_client = _build_client(_creds["api_id"], _creds["api_hash"])
        await tg_client.connect()
        if await tg_client.is_user_authorized():
            me = await tg_client.get_me()
            print(f"[bot] Resumed session as {me.first_name} (id={me.id}). Listening...")
        else:
            print("[bot] Session expired — log in from the UI.")
    else:
        print("[bot] No credentials yet — open the UI to sign in.")

    cfg    = uvicorn.Config(app, host="0.0.0.0", port=8000, loop="none")
    server = uvicorn.Server(cfg)
    await server.serve()

if __name__ == "__main__":
    asyncio.run(main())
