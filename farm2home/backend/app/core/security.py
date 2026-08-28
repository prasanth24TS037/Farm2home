import hashlib
import os
import secrets

def get_password_hash(password: str) -> str:
    # Reliable PBKDF2 SHA256 hashing without passlib/bcrypt incompatibility issues
    salt = secrets.token_hex(16)
    iterations = 100_000
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith("pbkdf2_sha256$"):
            _, iterations_str, salt, stored_key = hashed_password.split("$")
            iterations = int(iterations_str)
            key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), iterations)
            return secrets.compare_digest(key.hex(), stored_key)
        elif hashed_password.startswith("sha256$"):
            _, _, stored_hash = hashed_password.partition("$")
            return secrets.compare_digest(hashlib.sha256(plain_password.encode('utf-8')).hexdigest(), stored_hash)
        return False
    except Exception:
        return False
