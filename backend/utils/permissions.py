from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .jwt import decode_access_token

security = HTTPBearer()

# In-memory token blacklist (cleared on restart — acceptable for this scale)
_blacklisted_tokens = set()

def blacklist_token(token: str):
    _blacklisted_tokens.add(token)

def is_token_blacklisted(token: str) -> bool:
    return token in _blacklisted_tokens

ROLE_HIERARCHY = {
    "superuser": 10,
    "admin": 9,
    "approver": 8,
    "checker": 7,
    "operational_manager": 6.5,
    "accounts_manager": 6.5,
    "maker": 6,
    "records_incharge": 5,
    "office_incharge": 5,
    "plant_incharge": 4,
    "viewer": 3,
    "driver": 2
}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    if is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

async def require_role(min_role: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "viewer")
        if ROLE_HIERARCHY.get(user_role, 0) < ROLE_HIERARCHY.get(min_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker
