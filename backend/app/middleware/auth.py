from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import settings
from app.models.user import TokenData, UserRole

bearer_scheme = HTTPBearer()


def decode_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> TokenData:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if not user_id or not role:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return TokenData(user_id=user_id, role=role)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate token")


def require_roles(*roles: UserRole):
    def checker(token_data: TokenData = Depends(decode_token)) -> TokenData:
        if token_data.role not in [r.value for r in roles]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return token_data
    return checker


# Convenience dependencies
require_admin = require_roles(UserRole.admin)
require_caller = require_roles(UserRole.admin, UserRole.caller)
require_any = require_roles(UserRole.admin, UserRole.caller, UserRole.success_manager, UserRole.junior)
