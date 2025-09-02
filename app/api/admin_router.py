# app/api/admin_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Reclamo, Categoria
from app.services.security import require_role

router = APIRouter(tags=["admin"])

# ====================
# GET /admin/reclamos
# ====================


@router.get("/reclamos")
def listar_reclamos(
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "operator"))
):
    reclamos = db.query(Reclamo).order_by(Reclamo.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "user_message": r.user_message,
            "message": r.message,
            "enabled": r.enabled,
            "image_path": r.image_path,
            "categoria": {"id": r.categoria.id, "nombre": r.categoria.nombre} if r.categoria else None,
            "created_at": r.created_at.isoformat(),
            "user_id": r.user_id
        }
        for r in reclamos
    ]

# ====================
# GET /admin/stats
# ====================


@router.get("/stats")
def stats(
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "operator"))
):
    total = db.query(Reclamo).count()
    validos = db.query(Reclamo).filter(Reclamo.enabled == True).count()
    invalidos = total - validos
    # Contar categorías activas de la tabla Categoria
    categorias_activas = db.query(Categoria).filter(
        Categoria.estado == "A").count()
    return {
        "total": total,
        "validos": validos,
        "invalidos": invalidos,
        "categorias_activas": categorias_activas
    }
