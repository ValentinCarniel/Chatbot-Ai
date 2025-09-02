from pydantic import BaseModel, EmailStr
from typing import Optional

# --- Users ---


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True  # Para usar con ORM


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginInput(BaseModel):
    email: EmailStr
    password: str


# --- Reclamos ---

class ReclamoCreate(BaseModel):
    user_message: str
    categoria: Optional[str] = None
    image_path: Optional[str] = None


class ReclamoOut(BaseModel):
    id: int
    user_message: str
    message: Optional[str] = None
    categoria: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True  # Para usar con modelos SQLAlchemy
