from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .jwt import decode_access_token

security = HTTPBearer()

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
