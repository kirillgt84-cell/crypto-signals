"""
Promote a user to admin by email.
Usage: python scripts/make_admin.py <email>
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database import get_db


async def main(email: str):
    db = get_db()
    await db.connect()
    
    # Check if user exists
    rows = await db.query("SELECT id, username, subscription_tier FROM users WHERE email = $1", [email])
    if not rows:
        print(f"User with email {email} not found")
        await db.close()
        return 1
    
    user = rows[0]
    print(f"Found user: {user['username']} (id={user['id']}, current_tier={user['subscription_tier']})")
    
    # Update to admin
    await db.execute(
        "UPDATE users SET subscription_tier = 'admin', updated_at = NOW() WHERE id = $1",
        [user["id"]]
    )
    print(f"Updated {email} to admin")
    
    await db.close()
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/make_admin.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    exit_code = asyncio.run(main(email))
    sys.exit(exit_code)
