"""
AES-256 encryption for API keys using Fernet (from cryptography).
Key is derived from ENCRYPTION_KEY env var.
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

_ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")
_fernet: Fernet = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet
    if not _ENCRYPTION_KEY:
        raise RuntimeError("ENCRYPTION_KEY env var not set")
    # Derive a 32-byte key from the passphrase using PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"fastlane_portfolio_salt_v1",  # fixed salt is OK for this use case
        iterations=480000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(_ENCRYPTION_KEY.encode()))
    _fernet = Fernet(key)
    return _fernet


def encrypt(text: str) -> str:
    """Encrypt plaintext and return base64-encoded ciphertext."""
    if not text:
        return ""
    f = _get_fernet()
    return f.encrypt(text.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt base64-encoded ciphertext."""
    if not ciphertext:
        return ""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode()).decode()
