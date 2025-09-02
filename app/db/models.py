from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base
import enum


class RoleEnum(str, enum.Enum):
    admin = "admin"
    operator = "operator"
    user = "user"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(Enum(RoleEnum), default=RoleEnum.user, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    reclamos = relationship("Reclamo", back_populates="user")


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    estado = Column(String(10), default="A")  # esto debe existir

    reclamos = relationship("Reclamo", back_populates="categoria")


class Reclamo(Base):
    __tablename__ = "reclamos_vecinales"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text)             # respuesta del sistema
    user_message = Column(Text)        # mensaje del usuario
    enabled = Column(Boolean, default=True)
    image_path = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)

    user = relationship("User", back_populates="reclamos")
    categoria = relationship("Categoria", back_populates="reclamos")
