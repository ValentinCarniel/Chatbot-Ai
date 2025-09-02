# app/api/categorias_router.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Categoria
from app.services.security import get_current_user

router = APIRouter(tags=["categorias"])


@router.get("/categorias")
async def get_categorias(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    skip: int = Query(0, ge=0, description="Cantidad de registros a saltar"),
    limit: int = Query(
        20, ge=1, le=100, description="Cantidad máxima de registros a devolver")
):
    """
    Retorna las categorías activas, ordenadas alfabéticamente.
    Permite paginación mediante los parámetros 'skip' y 'limit'.
    """
    categorias = (
        db.query(Categoria)
        .filter(Categoria.estado == "A")
        .order_by(Categoria.nombre)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": len(categorias),
        "skip": skip,
        "limit": limit,
        "categorias": [{"id": c.id, "nombre": c.nombre, "estado": c.estado} for c in categorias]
    }
