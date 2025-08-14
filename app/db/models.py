from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, Boolean
from sqlalchemy.sql import func
from app.db.database import Base

class ReclamoVecinal(Base):
    __tablename__ = "reclamos_vecinales"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text, nullable=False)
    user_message = Column(Text, nullable=False)
    enabled = Column(Boolean, nullable=False)
    image_path = Column(String(255), nullable=True)
    categoria = Column(String(100), default="Otros Servicios")
    created_at = Column(TIMESTAMP, server_default=func.now())
