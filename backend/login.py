"""
Optional headless login — use this if you're deploying on a server with no
browser access. Otherwise just log in through the UI.

    python login.py
"""
import asyncio
from telethon import TelegramClient, errors

SESSION_NAME = "user_session"

async def main():
    api_id = int(input("API ID (from my.telegram.org): ").strip())
    api_hash = input("API Hash: ").strip()
    client = TelegramClient(SESSION_NAME, api_id, api_hash)
    await client.connect()

    if await client.is_user_authorized():
        me = await client.get_me()
        print(f"Already logged in as {me.first_name}.")
        await client.disconnect()
        return

    phone = input("Phone number (e.g. +85512345678): ").strip()
    await client.send_code_request(phone)
    code = input("Code from Telegram: ").strip()
    try:
        await client.sign_in(phone, code)
    except errors.SessionPasswordNeededError:
        pwd = input("2FA password: ").strip()
        await client.sign_in(password=pwd)

    me = await client.get_me()
    print(f"Done — logged in as {me.first_name}. Session saved.")

    # Also save credentials so the server can resume the session.
    import json, os
    os.makedirs("data", exist_ok=True)
    with open("data/credentials.json", "w") as f:
        json.dump({"api_id": api_id, "api_hash": api_hash}, f)

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
