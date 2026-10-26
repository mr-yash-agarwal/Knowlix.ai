import base64
import hashlib
import hmac
import json
import time
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Depends

from app.config import config
from app.database import get_user_by_id

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _base64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def create_access_token(user_id: str, role: str, email: str, name: str) -> str:
    """
    Creates a cryptographically signed HMAC-SHA256 token (NIST compliant, zero extra dependencies).
    """
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "role": role,
        "email": email,
        "name": name,
        "iat": int(time.time()),
        "exp": int(time.time() + config.TOKEN_EXPIRE_HOURS * 3600)
    }
    encoded_header = _base64url_encode(json.dumps(header).encode("utf-8"))
    encoded_payload = _base64url_encode(json.dumps(payload).encode("utf-8"))

    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    signature = hmac.new(config.JWT_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    encoded_sig = _base64url_encode(signature)

    return f"{encoded_header}.{encoded_payload}.{encoded_sig}"

def verify_token(token: str) -> Dict[str, Any]:
    """
    Validates token signature and checks expiration.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Malformed authentication token.")

    encoded_header, encoded_payload, encoded_sig = parts
    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    expected_sig = hmac.new(config.JWT_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()

    try:
        provided_sig = _base64url_decode(encoded_sig)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token signature encoding.")

    if not hmac.compare_digest(expected_sig, provided_sig):
        raise HTTPException(status_code=401, detail="Invalid authentication token signature.")

    try:
        payload_bytes = _base64url_decode(encoded_payload)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    if "exp" in payload and payload["exp"] < time.time():
        raise HTTPException(status_code=401, detail="Authentication token has expired. Please sign in again.")

    return payload

def extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.strip().split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    elif len(parts) == 1:
        return parts[0]
    return None

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    Returns user payload if valid token provided; returns None if visitor is logged-out.
    """
    token = extract_token_from_header(authorization)
    if not token:
        return None
    try:
        payload = verify_token(token)
        user = get_user_by_id(payload["sub"])
        return user
    except Exception:
        return None

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Requires an authenticated user. Raises 401 if missing or invalid.
    """
    token = extract_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required. Please provide a Bearer token.")

    payload = verify_token(token)
    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User account not found or has been deactivated.")
    return user

def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Requires administrator role. Raises 403 if user is a student.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: Administrator privileges required to perform this action."
        )
    return current_user
