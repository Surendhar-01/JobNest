from dataclasses import dataclass
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core import settings
from app.database.repository import Repository, auth_client
from app.database.sqlite_store import verify_jwt_token

bearer = HTTPBearer(auto_error=False)

@dataclass
class Identity:
    id: str
    email: str
    token: str
    profile: dict

def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not credentials:
        raise HTTPException(401, 'Sign in to continue')

    token = credentials.credentials
    user_id = None
    email = ''

    if settings.configured():
        client = auth_client()
        try:
            user = client.auth.get_user(token).user
            if not user:
                raise HTTPException(401, 'Invalid session')
            user_id = str(user.id)
            email = user.email or ''
        except Exception:
            raise HTTPException(401, 'Session invalid or expired; sign in again')
    else:
        payload = verify_jwt_token(token)
        if not payload:
            raise HTTPException(401, 'Session invalid or expired; sign in again')
        user_id = payload['sub']
        email = payload.get('email', '')

    rows = Repository(token).select('profiles', {'id': 'eq.' + str(user_id)})
    if not rows:
        raise HTTPException(404, 'Profile missing for this user')
    if not rows[0].get('is_active', True):
        raise HTTPException(403, 'This account is inactive; contact an administrator')

    return Identity(str(user_id), email, token, rows[0])

def admin_user(user: Identity = Depends(current_user)):
    if user.profile.get('role') != 'admin':
        raise HTTPException(403, 'Administrator role required')
    return user
